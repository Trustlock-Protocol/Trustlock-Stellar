import { useState } from "react";
import { buildCreateEscrow } from "../contract";

/**
 * CreateEscrow
 * Buyer fills in seller address, token, amount, optional expiry ledger.
 * Builds the transaction — user signs it with their wallet (Freighter etc.)
 */
export default function CreateEscrow() {
  const [buyer, setBuyer]     = useState("");
  const [seller, setSeller]   = useState("");
  const [token, setToken]     = useState("");
  const [amount, setAmount]   = useState("");
  const [expiry, setExpiry]   = useState("0");
  const [status, setStatus]   = useState<{ type: "ok"|"err"|"info"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", msg: "Building transaction…" });

    try {
      const tx = await buildCreateEscrow(
        buyer,
        seller,
        token,
        BigInt(amount),
        parseInt(expiry, 10)
      );
      // In a real app you'd pass `tx` to Freighter to sign + submit
      console.log("Prepared tx XDR:", tx.toXDR());
      setStatus({ type: "ok", msg: "Transaction built. Sign it with your wallet to lock funds." });
    } catch (err: unknown) {
      setStatus({ type: "err", msg: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Create Escrow</h2>
      <form onSubmit={handleSubmit}>
        <label>Your Wallet (Buyer)</label>
        <input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="G…" required />

        <label>Seller Address</label>
        <input value={seller} onChange={e => setSeller(e.target.value)} placeholder="G…" required />

        <label>Token Contract (e.g. USDC)</label>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="C…" required />

        <label>Amount (in stroops / smallest unit)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000000" required />

        <label>Expiry Ledger (0 = no expiry)</label>
        <input type="number" value={expiry} onChange={e => setExpiry(e.target.value)} />

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Building…" : "Lock Funds"}
        </button>
      </form>

      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
