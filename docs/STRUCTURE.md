# TrustLock — Project Structure

This document describes every file and folder in the TrustLock repository and explains its purpose.

---

## Top-Level Layout

```
trustlock/
├── contract/          # Rust smart contract (Soroban)
├── frontend/          # React + TypeScript UI
├── docs/              # Project documentation
├── CONTRIBUTING.md    # Contributor guide
├── LICENSE            # MIT License
└── README.md          # Project overview and quick start
```

---

## contract/

The Soroban smart contract written in Rust. This is the core of TrustLock — all escrow logic lives here.

```
contract/
├── Cargo.toml         # Rust package manifest and dependencies
└── src/
    └── lib.rs         # Contract implementation + unit tests
```

### contract/Cargo.toml

Defines the package metadata, dependencies, and build profile.

Key dependencies:
- `soroban-sdk = "21.0.0"` — the official Soroban SDK for writing contracts
- `soroban-sdk` with `testutils` feature in `[dev-dependencies]` — enables test helpers like `mock_all_auths()`, `Address::generate()`, and `StellarAssetClient`

The `[profile.release]` section is configured for WASM size optimization:
- `opt-level = "z"` — optimize for binary size
- `lto = true` — link-time optimization
- `codegen-units = 1` — single codegen unit for maximum optimization
- `panic = "abort"` — removes panic unwinding code (not needed in WASM)

### contract/src/lib.rs

The entire contract in a single file. Contains:

| Section | What it defines |
| --- | --- |
| Storage key | `ESCROW` symbol used as the instance storage key |
| `EscrowStatus` enum | `Active`, `Released`, `Refunded` — the three states of an escrow |
| `Escrow` struct | The full escrow data: buyer, seller, token, amount, status, expiry |
| `TrustLock` struct | The contract entry point (marked with `#[contract]`) |
| `create_escrow` | Locks funds from buyer into the contract |
| `release` | Transfers locked funds to seller |
| `refund` | Returns locked funds to buyer |
| `get_escrow` | Read-only view of current escrow state |
| `mod test` | Unit tests for all three flows |

---

## frontend/

The React + TypeScript web application. Users interact with the contract through this UI.

```
frontend/
├── index.html         # HTML entry point
├── vite.config.ts     # Vite build configuration
├── tsconfig.json      # TypeScript compiler options
├── package.json       # Node dependencies and scripts
├── .env.example       # Environment variable template
└── src/
    ├── main.tsx       # React app entry point
    ├── App.tsx        # Root component — renders all three panels
    ├── index.css      # Global styles
    ├── contract.ts    # Stellar SDK wrapper — all blockchain calls
    └── components/
        ├── CreateEscrow.tsx   # Form to lock funds
        ├── ReleaseEscrow.tsx  # Button to release funds to seller
        └── RefundEscrow.tsx   # Button to refund funds to buyer
```

### frontend/index.html

The single HTML file. Loads the React app via `<script type="module" src="/src/main.tsx">`. Vite injects the built assets here during `npm run build`.

### frontend/vite.config.ts

Configures Vite with:
- `@vitejs/plugin-react` for JSX transform
- `define` overrides for `process.env` and `global` — required because `@stellar/stellar-sdk` was originally written for Node.js and references these globals

### frontend/tsconfig.json

TypeScript config targeting ES2020 with strict mode enabled. Uses `"moduleResolution": "bundler"` which is the correct setting for Vite projects.

### frontend/package.json

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts Vite dev server at `http://localhost:5173` |
| `npm run build` | Type-checks and builds for production |
| `npm run preview` | Serves the production build locally |

### frontend/.env.example

Template for the required environment variable:

```
VITE_CONTRACT_ID=your_deployed_contract_id_here
```

Copy this to `.env` and fill in your deployed contract ID after running `stellar contract deploy`.

### frontend/src/contract.ts

The integration layer between the UI and the Stellar network. Exports:

- `buildCreateEscrow(buyer, seller, token, amount, expiryLedger)` — builds a prepared `create_escrow` transaction
- `buildRelease(buyer)` — builds a prepared `release` transaction
- `buildRefund(caller)` — builds a prepared `refund` transaction
- `getEscrow()` — simulates `get_escrow` and returns the result (no signing needed)

All functions use `rpc.Server` pointed at `https://soroban-testnet.stellar.org`. The contract ID is read from `import.meta.env.VITE_CONTRACT_ID`.

### frontend/src/components/

Three focused components, one per contract action:

| Component | Renders | Calls |
| --- | --- | --- |
| `CreateEscrow.tsx` | Form with buyer, seller, token, amount, expiry fields | `buildCreateEscrow()` |
| `ReleaseEscrow.tsx` | Single input (buyer address) + release button | `buildRelease()` |
| `RefundEscrow.tsx` | Single input (caller address) + refund button | `buildRefund()` |

Each component handles its own loading state and displays a status message (success / error / info) after the transaction is built.

### frontend/src/index.css

Minimal dark-theme stylesheet. Uses CSS custom properties and system fonts. No external CSS framework — keeps the bundle small.

---

## docs/

All project documentation lives here.

```
docs/
├── API.md             # Contract function reference and SDK usage
├── ARCHITECTURE.md    # System design and component relationships
├── DEPLOYMENT.md      # Step-by-step deploy guide (testnet + mainnet)
├── SECURITY.md        # Security model, known limitations, disclosure policy
├── STRUCTURE.md       # This file — every file explained
└── TESTING.md         # How to run and write tests
```

---

## Root Files

| File | Purpose |
| --- | --- |
| `README.md` | Project overview, features, quick start, roadmap |
| `CONTRIBUTING.md` | How to contribute — setup, branching, commits, PR process |
| `LICENSE` | MIT License |
