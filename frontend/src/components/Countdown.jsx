import { useEffect, useState } from "react";

function format(seconds) {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}m` : "", `${s}s`]
    .filter(Boolean)
    .join(" ");
}

export default function Countdown({ start, end }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!start || !end) {
    return <div className="countdown muted">Voting window not set</div>;
  }
  if (now < start) {
    return <div className="countdown">Voting opens in {format(start - now)}</div>;
  }
  if (now <= end) {
    return <div className="countdown open">Voting closes in {format(end - now)}</div>;
  }
  return <div className="countdown closed">Voting has ended</div>;
}
