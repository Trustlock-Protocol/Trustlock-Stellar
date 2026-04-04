# TrustLock — Security

This document describes the security model of TrustLock, known limitations, and how to responsibly disclose vulnerabilities.

---

## Security Model

TrustLock is a smart contract that holds real funds on behalf of users. Security is the highest priority in every design decision.

### What the Contract Guarantees

- **Only the buyer can release funds** — `release` requires `buyer.require_auth()`. No other party can trigger a release.
- **Only the buyer can refund** — `refund` requires `caller.require_auth()` and verifies the caller matches the stored buyer address, unless the escrow has expired.
- **Funds cannot be extracted by the contract deployer** — there is no admin function, no upgrade mechanism, and no backdoor. Once deployed, the contract logic is immutable.
- **Token transfers are atomic** — Soroban's execution model ensures that if a transfer fails, the entire transaction is rolled back. Funds are never partially moved.
- **State transitions are one-way** — an escrow moves from `Active` → `Released` or `Active` → `Refunded`. There is no way to reactivate a closed escrow.

### Authorization

Every state-changing function calls `require_auth()` before executing any logic. This is enforced at the Stellar network level — the transaction will be rejected if the required signature is not present.

```rust
// create_escrow
buyer.require_auth();

// release
buyer.require_auth();

// refund
caller.require_auth();
// + additional check: caller must be buyer OR escrow must be expired
```

### No Admin Keys

TrustLock has no admin, owner, or privileged role. There is no function that allows any party to:
- Drain the contract
- Pause or freeze escrows
- Change the buyer, seller, or amount after creation
- Upgrade the contract logic

This is intentional. The contract is designed to be trustless.

---

## Known Limitations

### Not Audited

TrustLock has not undergone a formal security audit. The contract logic has been reviewed by the development team and tested with unit tests, but this is not a substitute for a professional audit.

**Do not use TrustLock on mainnet with significant funds until an audit has been completed.**

### Single Escrow Per Contract Instance

The current design stores one escrow per deployed contract. This means:
- If `create_escrow` is called on a contract that already has an active escrow, it will panic
- There is no way to manage multiple concurrent escrows from a single contract address

This is a known limitation and is tracked in the roadmap. The fix (persistent storage keyed by buyer+seller pair) will be implemented in a future version.

### No Dispute Resolution

The current version has no arbitrator or dispute mechanism. If a buyer and seller disagree about whether delivery occurred, the only options are:
- Buyer releases voluntarily
- Buyer refunds voluntarily
- Escrow expires (if an expiry was set)

A dispute resolution system with an arbitrator address is planned for a future release.

### Expiry is Ledger-Based, Not Time-Based

The `expiry_ledger` field uses Stellar ledger sequence numbers, not wall-clock time. Stellar produces approximately one ledger every 5 seconds, but this is not guaranteed. Users should account for variance when setting expiry values.

Approximate conversion: `ledgers = seconds / 5`

For a 7-day escrow: `7 * 24 * 60 * 60 / 5 = 120,960 ledgers`

### No Re-entrancy Protection

Soroban's execution model does not allow re-entrant calls in the same way EVM contracts do. Cross-contract calls are synchronous and the host environment prevents the kind of re-entrancy attacks common in Solidity. However, this has not been formally verified for TrustLock's specific token interaction pattern.

---

## Threat Model

| Threat | Mitigation |
| --- | --- |
| Seller tries to take funds without delivering | `release` requires buyer's signature — seller cannot call it |
| Buyer tries to refund after seller delivers | Buyer must call `refund` before calling `release` — once released, funds are gone |
| Third party tries to drain the contract | All state-changing functions require auth from the buyer |
| Contract deployer tries to steal funds | No admin functions exist in the contract |
| Buyer and seller collude to defraud arbitrator | No arbitrator in current version — planned for future |
| Replay attack (reusing a signed transaction) | Stellar's sequence number system prevents transaction replay |

---

## Responsible Disclosure

If you discover a security vulnerability in TrustLock, please do not open a public GitHub issue. Public disclosure before a fix is available puts users at risk.

Instead, please report it privately:

1. Go to the repository on GitHub
2. Click the "Security" tab
3. Click "Report a vulnerability"
4. Describe the issue in detail, including steps to reproduce and potential impact

We will acknowledge your report within 48 hours and work with you on a fix and coordinated disclosure timeline.

We ask that you:
- Give us reasonable time to investigate and fix the issue before public disclosure
- Do not exploit the vulnerability or access user funds
- Do not disclose the issue to others until it has been resolved

---

## Security Best Practices for Users

- Always verify the contract ID before interacting with TrustLock
- Use a hardware wallet or Freighter with a dedicated account for escrow transactions
- Set a reasonable `expiry_ledger` on every escrow to ensure funds are recoverable if the seller disappears
- Do not use TrustLock on mainnet until an audit has been completed
- Verify the seller's address carefully before creating an escrow — transactions on Stellar are irreversible

---

## Audit Status

| Date | Auditor | Scope | Status |
| --- | --- | --- | --- |
| — | — | — | Not yet audited |

We are actively seeking a security audit partner. If you are a Soroban security researcher or audit firm, please reach out via the repository.
