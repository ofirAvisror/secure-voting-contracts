import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { getElection, getToken, getReceipt } from "../lib/eth";
import { computeProof } from "../lib/merkle";
import { TOPICS, SCALE } from "../lib/topics";
import Countdown from "./Countdown.jsx";

function loadVoterBook() {
  try {
    const raw = localStorage.getItem("voterBook");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function VoterPanel({ wallet, onConnect }) {
  const [candidates, setCandidates] = useState([]);
  const [window, setWindow] = useState({ start: 0, end: 0 });
  const [selected, setSelected] = useState(0);
  const [answers, setAnswers] = useState([3, 3, 3]);
  const [mode, setMode] = useState("direct");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState(false);
  const [balance, setBalance] = useState(null);
  const [receipts, setReceipts] = useState(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const election = getElection(wallet.provider);
    const [names, votes] = await election.getCandidates();
    setCandidates(names.map((name, i) => ({ id: i, name, votes: Number(votes[i]) })));
    setWindow({ start: Number(await election.votingStart()), end: Number(await election.votingEnd()) });
    setVoted(await election.hasVoted(wallet.account));

    const token = getToken(wallet.provider);
    setBalance(ethers.formatUnits(await token.balanceOf(wallet.account), 18));
    const receipt = getReceipt(wallet.provider);
    setReceipts(Number(await receipt.balanceOf(wallet.account)));
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function resolveProof() {
    const book = loadVoterBook();
    if (!book) {
      throw new Error("Voter book not found. The admin must set the voter book first.");
    }
    const proof = computeProof(book.addresses, wallet.account);
    if (!proof) {
      throw new Error("Your address is not in the voter book.");
    }
    return proof;
  }

  async function submit() {
    try {
      setBusy(true);
      setStatus("");
      const proof = resolveProof();
      const election = getElection(wallet.signer);
      const tx =
        mode === "direct"
          ? await election.voteDirect(selected, proof)
          : await election.voteByPreference(answers, proof);
      setStatus("Submitting vote...");
      await tx.wait();
      setStatus(
        mode === "direct"
          ? "Vote submitted."
          : "Vote submitted. Your closest-match candidate was chosen anonymously."
      );
      await refresh();
    } catch (err) {
      setStatus("Error: " + (err.reason || err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <div className="panel">
        <div className="card">
          <p>Connect your wallet to vote.</p>
          <button onClick={onConnect}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <Countdown start={window.start} end={window.end} />

      <div className="reward-row">
        <span>BAL balance: <strong>{balance ?? "-"}</strong></span>
        <span>Vote receipts: <strong>{receipts ?? "-"}</strong></span>
      </div>

      {voted ? (
        <div className="card success">
          <h2>You have already voted</h2>
          <p>Thank you. Your BAL reward and soulbound receipt are in your wallet.</p>
        </div>
      ) : (
        <div className="card">
          <div className="mode-switch">
            <button className={mode === "direct" ? "active" : ""} onClick={() => setMode("direct")}>
              Vote directly
            </button>
            <button className={mode === "match" ? "active" : ""} onClick={() => setMode("match")}>
              Vote by questionnaire
            </button>
          </div>

          {mode === "direct" ? (
            <div className="candidate-list">
              {candidates.length === 0 && <p className="muted">No candidates yet.</p>}
              {candidates.map((c) => (
                <label key={c.id} className="candidate-option">
                  <input
                    type="radio"
                    name="candidate"
                    checked={selected === c.id}
                    onChange={() => setSelected(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          ) : (
            <div className="questionnaire">
              <p className="hint">
                Answer the questions. The contract picks the closest-matching candidate without
                revealing who it is.
              </p>
              {TOPICS.map((topic, i) => (
                <div className="slider-row" key={topic.key}>
                  <label>{topic.question}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={answers[i]}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = Number(e.target.value);
                      setAnswers(next);
                    }}
                  />
                  <span className="scale-label">
                    {SCALE.find((s) => s.value === answers[i]).label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button disabled={busy} onClick={submit}>
            {mode === "direct" ? "Submit vote" : "Submit questionnaire"}
          </button>
        </div>
      )}

      {status && <div className="status">{status}</div>}
    </div>
  );
}
