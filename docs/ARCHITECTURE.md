# TrustLock — Architecture

This document describes the system design of TrustLock: how the components fit together, how data flows through the system, and the reasoning behind key design decisions.

---

## Overview

TrustLock is a two-layer system:

```
┌─────────────────────────────────────┐
│           Frontend (React/TS)        │
│  - Builds Soroban transactions       │
│  - User signs via Freighter wallet   │
└────────────────┬────────────────────┘
                 │  XDR Transaction
                 ▼
┌─────────────────────────────────────┐
│        Stellar Network (Testnet)     │
│  - Validates and executes tx         │
│  - Routes to Soroban runtime         │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      TrustLock Smart Contract        │
│      (Rust / Soroban WASM)           │
│  - Holds escrow state on-chain       │
│  - Enforces all business logic       │
│  - Controls token transfers          │
└─────────────────────────────────────┘
```

There is no backend server. All state lives on-chain. The frontend is a pure client-side application.

---

## Smart Contract Layer

### Language and Runtime

The contract is written in **Rust** and compiled to **WebAssembly (WASM)**. It runs inside Soroban's deterministic, sandboxed host environment on the Stellar network.

Rust was chosen for:
- Memory safety without a garbage collector
- Strong type system that catches logic errors at compile time
- First-class support in the Soroban SDK

### Contract Data Model

```rust
pub struct Escrow {
    pub buyer: Address,        // Party locking the funds
    pub seller: Address,       // Party receiving funds on release
    pub token: Address,        // SAC (Stellar Asset Contract) address
    pub amount: i128,          // Amount locked (in token's smallest unit)
    pub status: EscrowStatus,  // Active | Released | Refunded
    pub expiry_ledger: u32,    // Ledger sequence for auto-refund (0 = none)
}

pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
}
```

### Storage Model

TrustLock uses **Instance Storage** for the escrow record.

Instance storage is tied to the contract instance itself. It is always loaded when the contract is invoked, making reads cheap and consistent. This is appropriate for TrustLock because there is one active escrow per contract deployment.

The storage key is a short symbol: `ESCROW` (stored as `symbol_short!("ESCROW")`).

### Token Transfers

TrustLock does not hold a native balance. It uses the **Stellar Asset Contract (SAC)** token interface (`soroban_sdk::token::Client`) to move tokens between addresses.

On `create_escrow`:
```
buyer → contract  (transfer in)
```

On `release`:
```
contract → seller  (transfer out)
```

On `refund`:
```
contract → buyer  (transfer out)
```

This means TrustLock is compatible with any token that implements the SEP-41 token interface — including USDC, XLM (wrapped), and any future NGN stablecoin on Stellar.

### Authorization Model

Every state-changing function calls `require_auth()` on the relevant address before executing any logic. This ensures the Stellar network cryptographically verifies the caller's signature before the function body runs.

| Function | Auth required from |
| --- | --- |
| `create_escrow` | `buyer` |
| `release` | `buyer` |
| `refund` | `caller` (must be buyer, or escrow must be expired) |

The `get_escrow` function is read-only and requires no authorization.

### Expiry Logic

The `expiry_ledger` field stores a Stellar ledger sequence number. When `refund` is called:

1. If the caller is the buyer → refund is always allowed (while status is Active)
2. If the escrow has an expiry set AND the current ledger sequence is >= `expiry_ledger` → refund is allowed for any caller

This enables trustless time-based escrow: if a seller never delivers and the buyer disappears, the funds can be recovered after the deadline.

Setting `expiry_ledger = 0` disables the expiry entirely.

---

## Frontend Layer

### Stack

- **React 18** — component-based UI
- **TypeScript** — type safety across all SDK interactions
- **Vite** — fast dev server and build tool
- **@stellar/stellar-sdk** — official Stellar SDK for building and submitting transactions

### Transaction Flow

The frontend never holds private keys. It follows this pattern:

```
1. User fills form
2. Frontend calls buildCreateEscrow() / buildRelease() / buildRefund()
3. SDK fetches account sequence from RPC
4. SDK builds a TransactionBuilder with the contract call operation
5. SDK calls server.prepareTransaction() — simulates the tx and attaches footprint
6. Prepared XDR is passed to Freighter wallet
7. Freighter signs with user's private key
8. Frontend submits signed XDR to Stellar RPC
9. Network executes the contract function
```

### contract.ts

`src/contract.ts` is the single integration point between the UI and the blockchain. It exports three async functions:

- `buildCreateEscrow(buyer, seller, token, amount, expiryLedger)` → `Transaction`
- `buildRelease(buyer)` → `Transaction`
- `buildRefund(caller)` → `Transaction`
- `getEscrow()` → simulation result (read-only)

All functions use `rpc.Server` pointed at the Stellar Testnet RPC endpoint.

### Environment Configuration

The contract ID is injected at build time via Vite's `import.meta.env`:

```
VITE_CONTRACT_ID=C...your_contract_id
```

This keeps the contract address out of source code and makes it easy to switch between testnet and mainnet deployments.

---

## Data Flow Diagram

```
User Action (e.g. "Lock Funds")
        │
        ▼
CreateEscrow.tsx (React component)
        │  calls
        ▼
buildCreateEscrow() in contract.ts
        │  uses @stellar/stellar-sdk
        ▼
TransactionBuilder → prepareTransaction (RPC simulation)
        │
        ▼
Freighter Wallet (user signs)
        │
        ▼
Stellar RPC → Soroban Runtime
        │
        ▼
TrustLock contract: create_escrow()
        │  token.transfer(buyer → contract)
        ▼
Escrow stored in Instance Storage
```

---

## Design Decisions

### Why one escrow per contract instance?

The current design stores a single escrow per deployed contract. This keeps the contract simple, auditable, and cheap to deploy. Each escrow gets its own contract address, which makes it easy to track on-chain.

The roadmap includes multi-escrow support using a composite key (buyer + seller) for persistent storage, which will allow one contract to manage many concurrent escrows.

### Why no backend?

A backend introduces a centralized point of failure and trust. TrustLock's value proposition is trustlessness — the contract enforces all rules, and the state is publicly verifiable. A backend is not needed for the core escrow flow.

Future additions (notifications, indexing, dispute UI) may use a lightweight off-chain service, but it will never be in the critical path for fund safety.

### Why Instance Storage over Persistent?

For a single-escrow-per-contract model, instance storage is the right choice. It is always available, does not require TTL management, and is loaded automatically with every invocation. Persistent storage would be needed if we stored many escrows keyed by different identifiers.

---

## Future Architecture (Roadmap)

As TrustLock grows, the architecture will evolve:

```
Multi-escrow:   Persistent storage keyed by (buyer, seller) pair
Dispute system: Arbitrator address + 2-of-3 multisig release logic
SDK package:    @trustlock/sdk wrapping contract.ts for third-party use
Indexer:        Off-chain service reading contract events for UI history
```

See the README Roadmap section for the full list of planned features.
