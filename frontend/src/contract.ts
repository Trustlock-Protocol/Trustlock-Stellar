/**
 * contract.ts
 * Thin wrapper around Stellar SDK for calling TrustLock contract functions.
 * Replace CONTRACT_ID and NETWORK_PASSPHRASE with your deployed values.
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  rpc,
} from "@stellar/stellar-sdk";

// ── Config ────────────────────────────────────────────────────────────────────
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "";

const server = new rpc.Server(RPC_URL, { allowHttp: false });

// ── Helpers ───────────────────────────────────────────────────────────────────

function addressVal(addr: string) {
  return new Address(addr).toScVal();
}

function i128Val(n: bigint) {
  return nativeToScVal(n, { type: "i128" });
}

function u32Val(n: number) {
  return nativeToScVal(n, { type: "u32" });
}

// ── Contract calls ────────────────────────────────────────────────────────────

export async function buildCreateEscrow(
  buyerPublicKey: string,
  sellerAddress: string,
  tokenAddress: string,
  amount: bigint,
  expiryLedger: number
) {
  const account = await server.getAccount(buyerPublicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "create_escrow",
        addressVal(buyerPublicKey),
        addressVal(sellerAddress),
        addressVal(tokenAddress),
        i128Val(amount),
        u32Val(expiryLedger)
      )
    )
    .setTimeout(30)
    .build();

  return server.prepareTransaction(tx);
}

export async function buildRelease(buyerPublicKey: string) {
  const account = await server.getAccount(buyerPublicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("release", addressVal(buyerPublicKey)))
    .setTimeout(30)
    .build();

  return server.prepareTransaction(tx);
}

export async function buildRefund(callerPublicKey: string) {
  const account = await server.getAccount(callerPublicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("refund", addressVal(callerPublicKey)))
    .setTimeout(30)
    .build();

  return server.prepareTransaction(tx);
}

export async function getEscrow() {
  const contract = new Contract(CONTRACT_ID);
  // Read-only simulation — no signing needed
  const dummyAccount = await server.getAccount(
    "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN" // well-known testnet account
  );
  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_escrow"))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  return result;
}
