<div align="center">

# 🔒 TrustLock

### Smart Escrow for Everyday Transactions

<img src="https://img.shields.io/badge/Stellar-Soroban-purple" alt="Stellar Soroban" />
<img src="https://img.shields.io/badge/Language-Rust-orange" alt="Rust" />
<img src="https://img.shields.io/badge/Status-Testnet-green" alt="Status" />
<img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue" alt="React TypeScript" />

</div>

---

**TrustLock** is a decentralized escrow protocol built on Stellar's Soroban smart contract platform. It eliminates counterparty risk in everyday peer-to-peer transactions — no middlemen, no trust required, just code.

Think of it as the **"Escrow layer for the everyday person"** — built for freelancers, P2P traders, and anyone buying or selling without a safety net.

---

## 🧩 The Problem

Scams are rampant in informal commerce:

- Twitter/WhatsApp product sales where buyers pay and never receive goods
- Freelance gigs where clients disappear after delivery
- P2P crypto trades with no recourse after sending funds

Traditional escrow services are slow, expensive, and require trusting a third party. TrustLock replaces that with a transparent, on-chain contract that anyone can verify.

---

## ✨ Features

| Feature | Description |
| --- | --- |
| **Fund Locking** | Buyer deposits tokens into the contract. Funds are held on-chain until conditions are met. |
| **Buyer-Controlled Release** | Only the buyer can approve delivery and release funds to the seller. |
| **Instant Refund** | Buyer can cancel and reclaim funds at any time before release. |
| **Time-Based Auto-Refund** | Set an expiry ledger — funds automatically become refundable after the deadline. |
| **Token Agnostic** | Works with any Stellar token: XLM, USDC, or NGN stablecoins. |
| **Transparent State** | Full escrow state is readable on-chain by anyone. |

---

## 🔒 Security Architecture

TrustLock handles real funds, so security is the top priority. The contract is written in **Rust** for memory safety and runs on **Soroban's** sandboxed host environment to minimize attack surface.

### Authorization Model

Every state-changing function requires explicit `require_auth()` from the appropriate party:

- `create_escrow` — requires buyer authorization
- `release` — requires buyer authorization
- `refund` — requires buyer authorization, or is open to anyone after expiry

### No Admin Keys

There is no admin, owner, or privileged role. No party can drain the contract, pause escrows, or upgrade the logic after deployment. The contract is fully trustless by design.

For a full breakdown of the security model, known limitations, and threat analysis, see [docs/SECURITY.md](docs/SECURITY.md).

---

## 🏗️ Architecture

TrustLock is a two-layer system with no backend:

```
Frontend (React/TS)  →  Stellar Network  →  TrustLock Contract (Rust/WASM)
  Builds transactions      Validates & routes     Holds escrow state
  User signs w/ Freighter  to Soroban runtime     Controls token transfers
```

All state lives on-chain. The frontend is a pure client-side application.

For a deep dive into system design, data flow, and storage decisions, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

For a full breakdown of every file and folder, see [docs/STRUCTURE.md](docs/STRUCTURE.md).

---

## 🚀 Getting Started

### Prerequisites

- **Rust 1.70+** and WASM target: `rustup target add wasm32-unknown-unknown`
- **Node.js 18+**
- **Stellar CLI**: `cargo install --locked stellar-cli`
- **Freighter Wallet**: [Browser Extension](https://www.freighter.app/)

---

### 1. Clone and Build the Contract

```bash
git clone [your-repo-url]
cd trustlock/contract

cargo build --target wasm32-unknown-unknown --release
cargo test
```

All 3 tests should pass before you proceed.

---

### 2. Deploy to Testnet

```bash
# Create and fund a testnet identity
stellar keys generate --global alice --network testnet --fund

# Deploy
stellar contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/trustlock.wasm \
  --source alice \
  --network testnet
```

Copy the contract ID from the output.

```bash
cp frontend/.env.example frontend/.env
# Set VITE_CONTRACT_ID in frontend/.env to your contract ID
```

---

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

For the full deployment guide including mainnet instructions and troubleshooting, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 🔄 How It Works

```
Buyer fills form → Funds locked in contract → Seller delivers
                                             ↓
                              Buyer clicks Release ✅  →  Seller receives funds
                              Buyer clicks Refund  ❌  →  Buyer gets funds back
                              Expiry ledger reached ⏰  →  Refund becomes available
```

### Contract Interface

| Function | Caller | What it does |
| --- | --- | --- |
| `create_escrow(buyer, seller, token, amount, expiry_ledger)` | Buyer | Locks funds in the contract |
| `release(buyer)` | Buyer | Transfers funds to seller |
| `refund(caller)` | Buyer / anyone after expiry | Returns funds to buyer |
| `get_escrow()` | Anyone | Reads current escrow state |

For full parameter types, error codes, and TypeScript SDK usage, see [docs/API.md](docs/API.md).

---

## 🧪 Testing

```bash
cd contract
cargo test
```

| Test | What it verifies |
| --- | --- |
| `test_create_and_release` | Funds lock on create, seller receives on release |
| `test_refund` | Buyer gets full refund on cancel |
| `test_auto_refund_on_expiry` | Refund is available after expiry ledger is passed |

For the full testing guide including how to write new tests and test edge cases, see [docs/TESTING.md](docs/TESTING.md).

---

## 📦 SDK & Developer Integration

The `contract.ts` module exposes clean async functions for building Soroban transactions that any frontend or backend can consume.

```ts
import { buildCreateEscrow, buildRelease, buildRefund } from "./contract";

// Build a prepared transaction — sign with Freighter before submitting
const tx = await buildCreateEscrow(
  buyerPublicKey,
  sellerAddress,
  tokenAddress,
  BigInt(10_000_000), // 1 USDC
  0                   // no expiry
);
```

See [docs/API.md](docs/API.md) for the full API reference.

---

## 🗺️ Roadmap

- [ ] Multi-escrow support (per buyer+seller pair key)
- [ ] Arbitrator / dispute resolution system
- [ ] Freighter wallet deep integration
- [ ] NGN stablecoin support
- [ ] Marketplace plugin API for third-party integrations
- [ ] SDK package (`@trustlock/sdk`)
- [ ] Mobile-friendly UI
- [ ] Formal security audit

---

## 🌊 Stellar Community Contribution

TrustLock is an open-source project built for the Stellar ecosystem. We welcome developers to contribute, extend, and integrate.

- Browse [open issues]() to find tasks
- Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started
- Join the discussion on [Stellar Discord](https://discord.gg/stellardev)

---

## 🤝 Contributing

Contributions are welcome. Please open an issue before submitting large changes so we can align on direction.

```bash
# Fork the repo, then:
git checkout -b feat/your-feature
git commit -m "feat: describe your change"
git push origin feat/your-feature
# Open a Pull Request
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide — branching strategy, commit conventions, and PR process.

Please follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct in all interactions.

---

## 🛡️ Security

TrustLock is in active development and has not been audited. Do not use with mainnet funds until a formal audit is complete.

If you discover a vulnerability, please disclose it responsibly via a private GitHub security advisory rather than a public issue.

See [docs/SECURITY.md](docs/SECURITY.md) for the full security policy, threat model, and disclosure process.

---

## 📄 License

TrustLock is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
