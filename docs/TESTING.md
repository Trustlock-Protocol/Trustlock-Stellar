# TrustLock — Testing Guide

This document explains how to run the existing test suite, what each test covers, and how to write new tests for the TrustLock smart contract.

---

## Overview

TrustLock's test suite lives inside the contract source file at `contract/src/lib.rs` in a `#[cfg(test)]` module. Tests run in Soroban's native test environment — a full in-process simulation of the Stellar network that does not require a live node.

---

## Running the Tests

```bash
cd contract
cargo test
```

Expected output:

```
running 3 tests
test test::test_auto_refund_on_expiry ... ok
test test::test_refund ... ok
test test::test_create_and_release ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

To run a single test by name:

```bash
cargo test test_create_and_release
```

To see `println!` output during tests (useful for debugging):

```bash
cargo test -- --nocapture
```

---

## Test Coverage

### `test_create_and_release`

**What it tests**: The happy path — buyer locks funds, seller receives them on release.

**Steps**:
1. Deploys the contract and a test token
2. Mints 1000 tokens to the buyer
3. Calls `create_escrow` with amount 500
4. Asserts the contract holds 500 tokens
5. Calls `release`
6. Asserts the seller now holds 500 tokens
7. Asserts the escrow status is `Released`

**Why it matters**: This is the primary use case. If this test fails, the core escrow flow is broken.

---

### `test_refund`

**What it tests**: The buyer cancels — funds return in full.

**Steps**:
1. Deploys the contract and a test token
2. Mints 1000 tokens to the buyer
3. Calls `create_escrow` with amount 500
4. Calls `refund` as the buyer
5. Asserts the buyer's balance is back to 1000
6. Asserts the escrow status is `Refunded`

**Why it matters**: Ensures buyers are never trapped — they can always recover funds before release.

---

### `test_auto_refund_on_expiry`

**What it tests**: Time-based auto-refund — funds become refundable after the expiry ledger.

**Steps**:
1. Deploys the contract and a test token
2. Creates an escrow with `expiry_ledger = 10`
3. Advances the test ledger sequence to 11 using `env.ledger().with_mut()`
4. Calls `refund`
5. Asserts the buyer's balance is restored to 1000

**Why it matters**: Validates the time-lock mechanism that protects buyers when sellers go silent.

---

## Test Setup Helper

All tests share a `setup()` function that handles boilerplate:

```rust
fn setup() -> (Env, Address, Address, Address, TrustLockClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();  // Bypass signature verification in tests

    let contract_id = env.register_contract(None, TrustLock);
    let client = TrustLockClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);

    // Deploy a Stellar Asset Contract (SAC) as the test token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();

    // Mint 1000 tokens to buyer
    let sac = StellarAssetClient::new(&env, &token_address);
    sac.mint(&buyer, &1000);

    (env, buyer, seller, token_address, client)
}
```

Key points:
- `env.mock_all_auths()` — tells the test environment to approve all `require_auth()` calls automatically. This lets you test logic without generating real signatures.
- `Address::generate(&env)` — creates a random test address. Use this instead of hardcoding addresses.
- `register_stellar_asset_contract_v2` — deploys a real SAC token in the test environment, so token transfers behave exactly as they would on-chain.

---

## Writing New Tests

### Basic Template

```rust
#[test]
fn test_your_scenario() {
    let (env, buyer, seller, token, client) = setup();
    let token_client = TokenClient::new(&env, &token);

    // Arrange: set up the state you need
    client.create_escrow(&buyer, &seller, &token, &500, &0);

    // Act: call the function you are testing
    // ...

    // Assert: verify the outcome
    assert_eq!(token_client.balance(&seller), 500);
}
```

### Testing Expected Panics

To test that a function correctly rejects invalid input, use `#[should_panic]`:

```rust
#[test]
#[should_panic(expected = "escrow already exists")]
fn test_cannot_create_duplicate_escrow() {
    let (env, buyer, seller, token, client) = setup();

    client.create_escrow(&buyer, &seller, &token, &500, &0);
    // This second call should panic
    client.create_escrow(&buyer, &seller, &token, &500, &0);
}
```

### Testing with a Specific Ledger Sequence

```rust
#[test]
fn test_something_at_ledger_100() {
    let (env, buyer, seller, token, client) = setup();

    // Set the current ledger sequence
    env.ledger().with_mut(|l| l.sequence_number = 100);

    // Now any calls to env.ledger().sequence() return 100
    client.create_escrow(&buyer, &seller, &token, &500, &50); // already expired
}
```

### Testing Authorization Failures

To test that a function rejects unauthorized callers, disable `mock_all_auths` and use `mock_auths` selectively:

```rust
#[test]
#[should_panic]
fn test_seller_cannot_release() {
    let env = Env::default();
    // Do NOT call env.mock_all_auths() — we want real auth checks

    let contract_id = env.register_contract(None, TrustLock);
    let client = TrustLockClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    // ... setup token, create escrow ...

    // Seller tries to call release — should fail auth check
    client.release(&seller);
}
```

---

## Test Checklist for New Features

When adding a new contract function, write tests that cover:

- [ ] The happy path (function works as expected)
- [ ] Duplicate/invalid state (e.g. calling release twice)
- [ ] Authorization rejection (wrong caller)
- [ ] Edge cases (zero amount, expired ledger, etc.)

---

## Soroban Test Environment Notes

- **No network required** — tests run entirely in-process using `soroban-sdk`'s `testutils` feature
- **Deterministic** — the test environment is fully controlled; no randomness or timing issues
- **Fast** — tests complete in milliseconds
- **Token transfers are real** — the SAC deployed in tests behaves identically to a real Stellar token, so balance assertions are meaningful
- **Ledger sequence is controllable** — use `env.ledger().with_mut()` to simulate time passing

---

## Frontend Testing

Frontend component tests are not yet implemented. Contributions are welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md) for how to get started.

When frontend tests are added, they will live in `frontend/src/__tests__/` and can be run with:

```bash
cd frontend
npm test
```
