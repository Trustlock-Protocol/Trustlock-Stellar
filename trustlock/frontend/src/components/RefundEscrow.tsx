import { useState } from "react";
import { buildRefund } from "../contract";

/**
 * RefundEscrow
 * Buyer cancels — funds return. Also works after expiry.
 */
export default function RefundEscrow() {
  const [caller, setCaller]   = useState("");
  const [status, setStatus]   = useState<{ type: "ok"|"err"|"info"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "info", msg: "Building refund transaction…" });

    try {
      const tx = await buildRefund(caller);
      console.log("Refund tx XDR:", tx.toXDR());
      setStatus({ type: "ok", msg: "Transaction built. Sign to get your funds back." });
    } catch (err: unknown) {
      setStatus({ type: "err", msg: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>❌ Refund</h2>
      <form onSubmit={handleRefund}>
        <label>Your Wallet</label>
        <input value={caller} onChange={e => setCaller(e.target.value)} placeholder="G…" required />
        <button className="btn-danger" type="submit" disabled={loading}>
          {loading ? "Building…" : "Request Refund"}
        </button>
      </form>
      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
