import { useState } from "react";
import { getElection } from "../lib/eth";
import { computeRoot, mockCid } from "../lib/merkle";
import { TOPICS } from "../lib/topics";

export default function AdminPanel({ wallet }) {
  const [name, setName] = useState("");
  const [positions, setPositions] = useState([3, 3, 3]);
  const [voterText, setVoterText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function report(fn) {
    return async () => {
      try {
        setBusy(true);
        setStatus("");
        await fn();
      } catch (err) {
        setStatus("Error: " + (err.reason || err.message || String(err)));
      } finally {
        setBusy(false);
      }
    };
  }

  const addCandidate = report(async () => {
    const election = getElection(wallet.signer);
    const tx = await election.addCandidate(name, positions);
    await tx.wait();
    setStatus(`Candidate "${name}" added.`);
    setName("");
    setPositions([3, 3, 3]);
  });

  const setVoterBook = report(async () => {
    const addresses = voterText
      .split(/[\s,]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    if (addresses.length === 0) {
      throw new Error("No addresses provided");
    }
    const root = computeRoot(addresses);
    const cid = mockCid({ addresses, root });
    localStorage.setItem("voterBook", JSON.stringify({ addresses, root, cid }));
    const election = getElection(wallet.signer);
    const tx = await election.setVoterBook(root, cid);
    await tx.wait();
    setStatus(`Voter book set. Root ${root.slice(0, 10)}... CID ${cid}`);
  });

  const setWindow = report(async () => {
    const start = Math.floor(new Date(startTime).getTime() / 1000);
    const end = Math.floor(new Date(endTime).getTime() / 1000);
    if (!start || !end) {
      throw new Error("Pick both start and end times");
    }
    const election = getElection(wallet.signer);
    const tx = await election.setVotingWindow(start, end);
    await tx.wait();
    setStatus("Voting window set.");
  });

  return (
    <div className="panel">
      <section className="card">
        <h2>Add candidate</h2>
        <input
          placeholder="Candidate name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {TOPICS.map((topic, i) => (
          <div className="slider-row" key={topic.key}>
            <label>
              {topic.label}: <strong>{positions[i]}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={positions[i]}
              onChange={(e) => {
                const next = [...positions];
                next[i] = Number(e.target.value);
                setPositions(next);
              }}
            />
          </div>
        ))}
        <button disabled={busy || !name} onClick={addCandidate}>
          Add candidate
        </button>
      </section>

      <section className="card">
        <h2>Voter book (Merkle + mock IPFS)</h2>
        <p className="hint">Enter voter addresses, one per line.</p>
        <textarea
          rows="6"
          placeholder="0x...\n0x..."
          value={voterText}
          onChange={(e) => setVoterText(e.target.value)}
        />
        <button disabled={busy} onClick={setVoterBook}>
          Build tree and set voter book
        </button>
      </section>

      <section className="card">
        <h2>Voting window</h2>
        <label>Start</label>
        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <label>End</label>
        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <button disabled={busy} onClick={setWindow}>
          Set voting window
        </button>
      </section>

      {status && <div className="status">{status}</div>}
    </div>
  );
}
