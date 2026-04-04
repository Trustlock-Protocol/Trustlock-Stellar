import { useState } from "react";
import { buildRelease } from "../contract";

/**
 * ReleaseEscrow
 * Buyer confirms delivery — funds go to seller.
 */
export default function ReleaseEscrow() {
  const [buyer, setBuyer]     = useState("");
  const [status, setStatus]   = useState<{ type: "ok"|"err"|"info"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRelease(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", msg: "Building release transaction…" });

    try {
      const tx = await buildRelease(buyer);
      console.log("Release tx XDR:", tx.toXDR());
      setStatus({ type: "ok", msg: "Transaction built. Sign to release funds to seller." });
    } catch (err: unknown) {
      setStatus({ type: "err", msg: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>✅ Release Funds</h2>
      <form onSubmit={handleRelease}>
        <label>Your Wallet (Buyer)</label>
        <input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="G…" required />
        <button className="btn-success" type="submit" disabled={loading}>
          {loading ? "Building…" : "Release to Seller"}
        </button>
      </form>
      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
