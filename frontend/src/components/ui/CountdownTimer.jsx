import React, { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

const POLL_INTERVAL_MS = 60 * 60 * 1000;

function getSecondsRemaining(lastUpdatedAt) {
  if (!lastUpdatedAt) return null;
  const nextPollAt = new Date(lastUpdatedAt).getTime() + POLL_INTERVAL_MS;
  return Math.max(0, Math.floor((nextPollAt - Date.now()) / 1000));
}

function formatCountdown(totalSeconds) {
  if (totalSeconds === null) return '--:--';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CountdownTimer({ lastUpdatedAt, onRefetch }) {
  const [seconds, setSeconds] = useState(() => getSecondsRemaining(lastUpdatedAt));
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  useEffect(() => {
    setSeconds(getSecondsRemaining(lastUpdatedAt));
  }, [lastUpdatedAt]);

  useEffect(() => {
    if (seconds === null) return;
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (prev === 1) onRefetchRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <div className="countdown-timer" title="Time until next CCU refresh">
      <span className="countdown-timer__label">Next update in</span>
      <span className={`countdown-timer__value${seconds === 0 ? ' countdown-timer__value--refreshing' : ''}`}>
        {seconds === 0 ? 'Refreshing\u2026' : formatCountdown(seconds)}
      </span>
    </div>
  );
}
