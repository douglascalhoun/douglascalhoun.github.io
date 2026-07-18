-- LLM Presenter: article scrape fields + user memory + digests + chat

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS scraped_body TEXT,
  ADD COLUMN IF NOT EXISTS scraped_excerpt TEXT,
  ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scrape_error TEXT,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_articles_scrape_status
  ON articles(scrape_status, created_at DESC)
  WHERE scrape_status IS DISTINCT FROM 'ok';

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    system_prompt_extra TEXT DEFAULT '',
    last_visited_at TIMESTAMP WITH TIME ZONE,
    last_digest_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    since_at TIMESTAMP WITH TIME ZONE,
    summary_markdown TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    article_ids UUID[] DEFAULT '{}',
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digests_user_created
  ON digests(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS presenter_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presenter_messages_user
  ON presenter_messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS custom_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, url)
);
