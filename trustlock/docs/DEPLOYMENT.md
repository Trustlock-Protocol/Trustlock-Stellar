# TrustLock — Deployment Guide

This guide walks through deploying TrustLock from source to a live Stellar network — testnet first, then mainnet when you are ready.

---

## Prerequisites

Before you begin, make sure you have:

- **Rust 1.70+** with the WASM target installed
- **Stellar CLI** installed
- **Node.js 18+** for the frontend
- A **Freighter wallet** browser extension for testing

### Install Rust

```bash
curl https://sh.rustup.rs -sSf | sh
rustup target add wasm32-unknown-unknown
```

Verify:
```bash
rustc --version
# rustc 1.70.0 or higher
```

### Install Stellar CLI

```bash
cargo install --locked stellar-cli
```

Verify:
```bash
stellar --version
```

---

## Step 1 — Build the Contract

Navigate to the contract directory and compile to WASM:

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file will be at:
```
contract/target/wasm32-unknown-unknown/release/trustlock.wasm
```

Run tests before deploying to confirm everything is working:

```bash
cargo test
```

All three tests should pass:
```
test test::test_auto_refund_on_expiry ... ok
test test::test_refund ... ok
test test::test_create_and_release ... ok
test result: ok. 3 passed; 0 failed
```

---

## Step 2 — Set Up a Testnet Identity

The Stellar CLI uses named key identities to sign transactions. Create one and fund it from the testnet faucet:

```bash
stellar keys generate --global alice --network testnet --fund
```

This creates a keypair named `alice` and requests testnet XLM from Friendbot automatically.

Check the balance to confirm funding worked:

```bash
stellar account show alice --network testnet
```

You should see a balance of 10,000 XLM.

---

## Step 3 — Deploy to Testnet

```bash
stellar contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/trustlock.wasm \
  --source alice \
  --network testnet
```

The CLI will output a contract ID that looks like:

```
CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Save this — you will need it for the frontend.

---

## Step 4 — Configure the Frontend

Copy the environment template:

```bash
cp frontend/.env.example frontend/.env
```

Open `frontend/.env` and set your contract ID:

```
VITE_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 5 — Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. You should see the TrustLock UI with three panels: Create Escrow, Release Funds, and Refund.

---

## Step 6 — Test the Full Flow on Testnet

You will need two testnet accounts — one for the buyer and one for the seller. You can create them with:

```bash
stellar keys generate --global buyer --network testnet --fund
stellar keys generate --global seller --network testnet --fund
```

Get their public keys:
```bash
stellar keys address buyer
stellar keys address seller
```

You will also need a testnet token. The easiest option is to use the Stellar testnet USDC contract. Alternatively, you can deploy a test token:

```bash
stellar contract asset deploy \
  --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --network testnet \
  --source alice
```

With the buyer's public key, seller's public key, and token contract address in hand, use the UI to:

1. Fill in the Create Escrow form and click "Lock Funds"
2. Sign the transaction in Freighter
3. Confirm the escrow is active using Stellar Explorer: `https://stellar.expert/explorer/testnet`
4. Click "Release to Seller" and sign
5. Verify the seller's balance increased

---

## Verifying On-Chain State

You can read the escrow state at any time using the Stellar CLI:

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source alice \
  --network testnet \
  -- get_escrow
```

This returns the full `Escrow` struct as JSON.

---

## Mainnet Deployment

> **Warning**: TrustLock has not been formally audited. Do not deploy to mainnet with real user funds until an audit is complete.

When you are ready for mainnet, the process is identical — just replace `--network testnet` with `--network mainnet` throughout.

You will need:
- A funded mainnet account (real XLM)
- A mainnet identity in the Stellar CLI: `stellar keys generate --global mainnet-deployer --network mainnet`
- A separate `.env` file for production with the mainnet contract ID

```bash
# Build (same WASM works for both networks)
cargo build --target wasm32-unknown-unknown --release

# Deploy to mainnet
stellar contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/trustlock.wasm \
  --source mainnet-deployer \
  --network mainnet
```

Update your production frontend environment:
```
VITE_CONTRACT_ID=C...mainnet_contract_id
```

Build the frontend for production:
```bash
cd frontend
npm run build
```

The `dist/` folder contains the static files ready to deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Environment Variables Reference

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_CONTRACT_ID` | Yes | The deployed TrustLock contract address |

---

## Troubleshooting

**`cargo build` fails with linker errors**

Make sure the WASM target is installed:
```bash
rustup target add wasm32-unknown-unknown
```

**`stellar contract deploy` fails with "insufficient funds"**

Your deployer account needs XLM to pay for the deployment. On testnet, run:
```bash
stellar keys fund alice --network testnet
```

**Frontend shows "no escrow found" immediately**

This is expected — the contract has no escrow until `create_escrow` is called. Create an escrow first.

**Freighter shows "transaction failed"**

Check that:
- The contract ID in `.env` matches your deployed contract
- The buyer has enough token balance to cover the escrow amount
- You are connected to the correct network in Freighter (Testnet vs Mainnet)

**`VITE_CONTRACT_ID` is undefined in the browser**

Make sure your `.env` file is in the `frontend/` directory (not the root), and that you restarted the dev server after editing it.
