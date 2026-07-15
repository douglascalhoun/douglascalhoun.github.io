-- Comment harvest tables for Worldwire

CREATE TABLE IF NOT EXISTS article_comment_snapshots (
    article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'unknown',
    comment_count INTEGER DEFAULT 0,
    parent_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    source_thread_url TEXT,
    error_message TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    raw_meta JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    parent_external_id TEXT,
    author TEXT,
    author_location TEXT,
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    depth INTEGER DEFAULT 0,
    permalink TEXT,
    is_editors_pick BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (article_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article
  ON article_comments(article_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_comment_snapshots_fetched
  ON article_comment_snapshots(fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_snapshots_platform
  ON article_comment_snapshots(platform, status);
