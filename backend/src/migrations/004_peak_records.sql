CREATE TABLE IF NOT EXISTS peak_records (
  id          SERIAL PRIMARY KEY,
  appid       INTEGER NOT NULL REFERENCES games(appid),
  record_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_days INTEGER NOT NULL,
  ccu         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS peak_records_at_idx ON peak_records(record_at DESC);
