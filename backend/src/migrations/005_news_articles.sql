CREATE TABLE IF NOT EXISTS news_articles (
  id           SERIAL PRIMARY KEY,
  appid        INTEGER NOT NULL REFERENCES games(appid),
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  source_name  TEXT NOT NULL,
  snippet      TEXT,
  published_at TIMESTAMPTZ,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS news_articles_url_idx    ON news_articles(url);
CREATE INDEX        IF NOT EXISTS news_articles_scraped_idx ON news_articles(scraped_at DESC);
