CREATE TABLE IF NOT EXISTS games (
    appid           INTEGER       PRIMARY KEY,
    name            TEXT          NOT NULL,
    header_image    TEXT,
    last_fetched_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ccu_snapshots (
    id           BIGSERIAL    PRIMARY KEY,
    appid        INTEGER      NOT NULL REFERENCES games(appid) ON DELETE CASCADE,
    ccu          INTEGER      NOT NULL,
    captured_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_appid_time ON ccu_snapshots (appid, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at ON ccu_snapshots (captured_at);

CREATE TABLE IF NOT EXISTS daily_peaks (
    appid      INTEGER  NOT NULL REFERENCES games(appid) ON DELETE CASCADE,
    peak_date  DATE     NOT NULL,
    peak_ccu   INTEGER  NOT NULL,
    PRIMARY KEY (appid, peak_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_peaks_appid_date ON daily_peaks (appid, peak_date DESC);

CREATE TABLE IF NOT EXISTS leaderboard_cache (
    rank            SMALLINT     NOT NULL,
    appid           INTEGER      NOT NULL REFERENCES games(appid) ON DELETE CASCADE,
    current_ccu     INTEGER      NOT NULL,
    peak_24h        INTEGER      NOT NULL,
    last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (appid)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_cache (rank);
