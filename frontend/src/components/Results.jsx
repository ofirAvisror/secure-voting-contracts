import { useCallback, useEffect, useState } from "react";
import { getElection } from "../lib/eth";
import Countdown from "./Countdown.jsx";

export default function Results({ wallet }) {
  const [rows, setRows] = useState([]);
  const [window, setWindow] = useState({ start: 0, end: 0 });
  const [totalVotes, setTotalVotes] = useState(0);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const election = getElection(wallet.provider);
    const [ids, names, votes] = await election.getResultsSorted();
    setRows(names.map((name, i) => ({ id: Number(ids[i]), name, votes: Number(votes[i]) })));
    setWindow({ start: Number(await election.votingStart()), end: Number(await election.votingEnd()) });
    setTotalVotes(Number(await election.totalVotes()));
  }, [wallet]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
      refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!wallet) {
    return (
      <div className="panel">
        <div className="card">
          <p>Connect your wallet to view results.</p>
        </div>
      </div>
    );
  }

  const ended = window.end > 0 && now > window.end;
  const maxVotes = rows.reduce((m, r) => Math.max(m, r.votes), 0);

  return (
    <div className="panel">
      <Countdown start={window.start} end={window.end} />
      <div className="reward-row">
        <span>Total votes: <strong>{totalVotes}</strong></span>
        <span>{ended ? "Final results" : "Live results"}</span>
      </div>

      {ended && rows.length > 0 && (
        <div className="card winner">
          <span className="crown">Winner</span>
          <h2>{rows[0].name}</h2>
          <p>{rows[0].votes} votes</p>
        </div>
      )}

      <div className="card">
        <h2>Ranking</h2>
        {rows.length === 0 && <p className="muted">No candidates yet.</p>}
        {rows.map((r, i) => (
          <div className="result-row" key={r.id}>
            <span className="rank">#{i + 1}</span>
            <span className="result-name">{r.name}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: maxVotes ? `${(r.votes / maxVotes) * 100}%` : "0%" }}
              />
            </div>
            <span className="result-votes">{r.votes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
