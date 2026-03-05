CREATE TABLE IF NOT EXISTS wishlist_tracking (
  appid     INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
