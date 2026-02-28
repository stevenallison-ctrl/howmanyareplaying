import React, { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

const POLL_INTERVAL_MS = 60 * 60 * 1000;

function getSecondsRemaining(lastUpdatedAt) {
  if (!lastUpdatedAt) return null;
  const nextPollAt = new Date(lastUpdatedAt).getTime() + POLL_INTERVAL_MS;
  return Math.max(0, Math.floor((nextPollAt - Date.now()) / 1000));
}

export default function CountdownTimer({ lastUpdatedAt, onRefetch }) {
  const [seconds, setSeconds] = useState(() => getSecondsRemaining(lastUpdatedAt));
  const onRefetchRef = useRef(onRefetch);
  const secsRef      = useRef(null);
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

  // Restart the seconds animation on every tick.
  // Double rAF ensures we're in a fresh paint frame after React's DOM commit.
  useEffect(() => {
    const el = secsRef.current;
    if (!el) return;
    el.classList.remove('tick');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add('tick');
      });
    });
  }, [seconds]);

  if (seconds === 0) {
    return (
      <div className="countdown-timer" title="Time until next CCU refresh">
        <span className="countdown-timer__label">Next update in</span>
        <span className="countdown-timer__value countdown-timer__value--refreshing">
          Refreshing&hellip;
        </span>
      </div>
    );
  }

  const m  = seconds === null ? '--' : String(Math.floor(seconds / 60)).padStart(2, '0');
  const s  = seconds === null ? '--' : String(seconds % 60).padStart(2, '0');

  return (
    <div className="countdown-timer" title="Time until next CCU refresh">
      <span className="countdown-timer__label">Next update in</span>
      <span className="countdown-timer__value">
        <span className="countdown-timer__mins">{m}:</span>
        <span ref={secsRef} className="countdown-timer__secs tick">{s}</span>
      </span>
    </div>
  );
}
