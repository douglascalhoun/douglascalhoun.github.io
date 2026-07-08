-- Phase 5 schema additions

-- Rate limiting preference on subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS max_notifications_per_hour INTEGER DEFAULT 20;

-- User article state (read / favorite) keyed by browser user_id
CREATE TABLE IF NOT EXISTS user_article_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_user_article_state_user
  ON user_article_state(user_id);

CREATE INDEX IF NOT EXISTS idx_user_article_state_favorite
  ON user_article_state(user_id, is_favorite)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
  ON notification_log(subscription_id, sent_at DESC);

-- Full-text search support for articles
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON articles USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
