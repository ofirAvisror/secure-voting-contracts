import { useEffect, useState } from "react";
import {
  connectWallet,
  getElection,
  isConfigured,
  getDeployment,
  getExpectedChainId,
  switchNetwork
} from "./lib/eth";
import AdminPanel from "./components/AdminPanel.jsx";
import VoterPanel from "./components/VoterPanel.jsx";
import Results from "./components/Results.jsx";

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [tab, setTab] = useState("vote");
  const [error, setError] = useState("");
  const configured = isConfigured();
  const expectedChainId = getExpectedChainId();
  const wrongNetwork = wallet && wallet.chainId !== expectedChainId;

  async function handleConnect() {
    try {
      setError("");
      const w = await connectWallet();
      setWallet(w);
      if (w.chainId !== expectedChainId) {
        setIsOwner(false);
        return;
      }
      const election = getElection(w.signer);
      const owner = await election.owner();
      setIsOwner(owner.toLowerCase() === w.account.toLowerCase());
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function handleSwitch() {
    try {
      setError("");
      await switchNetwork();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Elections 2025</h1>
          <p className="subtitle">Decentralized voting with OfirOr (OFO) rewards</p>
        </div>
        <div className="wallet">
          {wallet ? (
            <div className="wallet-info">
              <span className="badge">{isOwner ? "Admin" : "Voter"}</span>
              <code>{wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}</code>
            </div>
          ) : (
            <button onClick={handleConnect}>Connect Wallet</button>
          )}
        </div>
      </header>

      {wrongNetwork && (
        <div className="error">
          <p>
            Wrong network. MetaMask is on chain {wallet.chainId}, but the contracts are deployed on
            chain {expectedChainId} ({getDeployment().network}).
          </p>
          <button onClick={handleSwitch}>Switch to {getDeployment().network}</button>
        </div>
      )}

      {error && !wrongNetwork && <div className="error">{error}</div>}

      {!configured && (
        <div className="notice">
          Contracts are not configured yet. Deploy the contracts
          (<code>npm run deploy:local</code>) to generate <code>src/contracts.json</code>.
        </div>
      )}

      {configured && wrongNetwork && (
        <div className="notice">Switch to the correct network to continue.</div>
      )}

      {configured && !wrongNetwork && (
        <>
          <nav className="tabs">
            <button className={tab === "vote" ? "active" : ""} onClick={() => setTab("vote")}>
              Vote
            </button>
            <button className={tab === "results" ? "active" : ""} onClick={() => setTab("results")}>
              Results
            </button>
            {isOwner && (
              <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
                Admin
              </button>
            )}
          </nav>

          <main className="content">
            {tab === "vote" && <VoterPanel wallet={wallet} onConnect={handleConnect} />}
            {tab === "results" && <Results wallet={wallet} />}
            {tab === "admin" && isOwner && <AdminPanel wallet={wallet} />}
          </main>
        </>
      )}

      <footer className="footer">
        <span>Network: {getDeployment().network}</span>
      </footer>
    </div>
  );
}
