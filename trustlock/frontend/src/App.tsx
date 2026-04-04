import CreateEscrow from "./components/CreateEscrow";
import ReleaseEscrow from "./components/ReleaseEscrow";
import RefundEscrow from "./components/RefundEscrow";

export default function App() {
  return (
    <div className="app">
      <h1>🔒 TrustLock</h1>
      <p className="subtitle">Smart Escrow for Everyday Transactions</p>
      <CreateEscrow />
      <ReleaseEscrow />
      <RefundEscrow />
    </div>
  );
}
