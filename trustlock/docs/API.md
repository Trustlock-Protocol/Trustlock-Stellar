# TrustLock — API Reference

This document covers the full public interface of the TrustLock smart contract and the TypeScript SDK wrapper used by the frontend.

---

## Smart Contract Functions

The TrustLock contract exposes four public functions. Three are state-changing (require a signed transaction) and one is read-only (can be simulated without signing).

---

### `create_escrow`

Locks funds from the buyer into the contract. Creates a new escrow record in instance storage.

**Signature**
```rust
pub fn create_escrow(
    env: Env,
    buyer: Address,
    seller: Address,
    token: Address,
    amount: i128,
    expiry_ledger: u32,
)
```

**Parameters**

| Parameter | Type | Description |
| --- | --- | --- |
| `buyer` | `Address` | The wallet address locking the funds. Must authorize this call. |
| `seller` | `Address` | The wallet address that will receive funds on release. |
| `token` | `Address` | The Stellar Asset Contract (SAC) address of the token to lock. |
| `amount` | `i128` | Amount to lock, in the token's smallest unit (e.g. stroops for XLM). |
| `expiry_ledger` | `u32` | Ledger sequence number after which a refund can be triggered by anyone. Pass `0` to disable expiry. |

**Authorization**: `buyer.require_auth()`

**Side effects**:
- Transfers `amount` of `token` from `buyer` to the contract address
- Stores the `Escrow` record in instance storage

**Errors**:
- Panics with `"escrow already exists"` if an escrow is already stored for this contract instance
- Panics if the token transfer fails (e.g. insufficient balance)

---

### `release`

Releases locked funds to the seller. Called by the buyer after confirming delivery.

**Signature**
```rust
pub fn release(env: Env, buyer: Address)
```

**Parameters**

| Parameter | Type | Description |
| --- | --- | --- |
| `buyer` | `Address` | The buyer's wallet address. Must match the stored escrow buyer. |

**Authorization**: `buyer.require_auth()`

**Side effects**:
- Transfers `amount` of `token` from the contract to `seller`
- Updates escrow status to `Released`

**Errors**:
- Panics with `"no escrow found"` if no escrow exists
- Panics with `"not the buyer"` if the caller does not match the stored buyer
- Panics with `"escrow not active"` if the escrow has already been released or refunded

---

### `refund`

Returns locked funds to the buyer. Can be called by the buyer at any time, or by anyone after the expiry ledger is reached.
git stt**Signature**
```rust
pub fn refund(env: Env, caller: Address)
```

**Parameters**

| Parameter | Type | Description |
| --- | --- | --- |
| `caller` | `Address` | The address initiating the refund. Must be the buyer, or the escrow must be expired. |

**Authorization**: `caller.require_auth()`

**Side effects**:
- Transfers `amount` of `token` from the contract back to `buyer`
- Updates escrow status to `Refunded`

**Errors**:
- Panics with `"no escrow found"` if no escrow exists
- Panics with `"escrow not active"` if the escrow has already been released or refunded
- Panics with `"not authorised to refund"` if the caller is not the buyer and the escrow has not expired

---

### `get_escrow`

Returns the current escrow state. Read-only — no authorization required, no state changes.

**Signature**
```rust
pub fn get_escrow(env: Env) -> Escrow
```

**Returns**

```rust
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub token: Address,
    pub amount: i128,
    pub status: EscrowStatus,  // Active | Released | Refunded
    pub expiry_ledger: u32,
}
```

**Errors**:
- Panics with `"no escrow found"` if no escrow has been created yet

---

## Data Types

### `EscrowStatus`

```rust
pub enum EscrowStatus {
    Active,    // Funds are locked, awaiting release or refund
    Released,  // Funds have been sent to the seller
    Refunded,  // Funds have been returned to the buyer
}
```

### `Escrow`

```rust
pub struct Escrow {
    pub buyer: Address,        // Address that locked the funds
    pub seller: Address,       // Address that receives funds on release
    pub token: Address,        // SAC token contract address
    pub amount: i128,          // Locked amount in smallest token unit
    pub status: EscrowStatus,  // Current state
    pub expiry_ledger: u32,    // Auto-refund ledger (0 = no expiry)
}
```

---

## TypeScript SDK (contract.ts)

The frontend uses `src/contract.ts` as a thin wrapper around `@stellar/stellar-sdk`. It handles account fetching, transaction building, and simulation.

All functions return a `Transaction` object (prepared and ready to be signed by Freighter).

### Configuration

```ts
// src/contract.ts
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "";
```

Set `VITE_CONTRACT_ID` in your `.env` file to your deployed contract address.

---

### `buildCreateEscrow`

```ts
async function buildCreateEscrow(
  buyerPublicKey: string,
  sellerAddress: string,
  tokenAddress: string,
  amount: bigint,
  expiryLedger: number
): Promise<Transaction>
```

Builds a prepared `create_escrow` transaction. The returned transaction must be signed by the buyer's wallet before submission.

**Example**
```ts
import { buildCreateEscrow } from "./contract";

const tx = await buildCreateEscrow(
  "GABC...buyer",
  "GXYZ...seller",
  "CDEF...usdc_contract",
  BigInt(10_000_000), // 1 USDC (7 decimal places)
  0                   // no expiry
);

// Sign with Freighter, then submit
const signedXDR = await window.freighter.signTransaction(tx.toXDR(), {
  networkPassphrase: NETWORK_PASSPHRASE,
});
```

---

### `buildRelease`

```ts
async function buildRelease(buyerPublicKey: string): Promise<Transaction>
```

Builds a prepared `release` transaction. Must be signed by the buyer.

**Example**
```ts
import { buildRelease } from "./contract";

const tx = await buildRelease("GABC...buyer");
```

---

### `buildRefund`

```ts
async function buildRefund(callerPublicKey: string): Promise<Transaction>
```

Builds a prepared `refund` transaction. Must be signed by the caller (buyer, or anyone if expired).

**Example**
```ts
import { buildRefund } from "./contract";

const tx = await buildRefund("GABC...buyer");
```

---

### `getEscrow`

```ts
async function getEscrow(): Promise<rpc.Api.SimulateTransactionResponse>
```

Simulates the `get_escrow` call and returns the raw simulation response. No signing required.

**Example**
```ts
import { getEscrow } from "./contract";

const result = await getEscrow();
console.log(result);
```

---

## Amount Encoding

Stellar tokens use integer arithmetic. There are no decimals on-chain. The number of decimal places depends on the token:

| Token | Decimals | 1 unit in contract |
| --- | --- | --- |
| XLM | 7 | `10_000_000` |
| USDC (Circle) | 7 | `10_000_000` |
| Custom tokens | varies | check token contract |

Always pass amounts as `bigint` in TypeScript to avoid precision loss:

```ts
const oneUSDC = BigInt(10_000_000);
const tenUSDC = BigInt(100_000_000);
```

---

## Error Reference

| Error message | Cause |
| --- | --- |
| `"escrow already exists"` | `create_escrow` called when an escrow is already stored |
| `"no escrow found"` | Any function called before `create_escrow` |
| `"not the buyer"` | `release` called with an address that doesn't match stored buyer |
| `"escrow not active"` | `release` or `refund` called after escrow is already closed |
| `"not authorised to refund"` | `refund` called by non-buyer before expiry |
