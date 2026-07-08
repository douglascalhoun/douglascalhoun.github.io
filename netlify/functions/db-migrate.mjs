// Apply Phase 5 schema migrations and fix broken feeds
import { getDatabase } from './lib/db.mjs';

const MIGRATION_SQL = `
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS max_notifications_per_hour INTEGER DEFAULT 20;

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
`;

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const db = await getDatabase();
    await db.query(MIGRATION_SQL);

    // Replace broken Reuters feed with NYT World
    const reuters = await db.query(
      `SELECT id FROM feeds WHERE url ILIKE '%reuters%' OR name ILIKE '%reuters%'`
    );

    if (reuters.rows.length > 0) {
      await db.query(
        `UPDATE feeds
         SET name = $1, url = $2, category = 'world', country = 'US', active = true
         WHERE id = $3`,
        [
          'NYT World',
          'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
          reuters.rows[0].id
        ]
      );
    } else {
      await db.query(
        `INSERT INTO feeds (name, url, category, country, language)
         VALUES ($1, $2, 'world', 'US', 'en')
         ON CONFLICT (url) DO NOTHING`,
        ['NYT World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml']
      );
    }

    const feeds = await db.query('SELECT COUNT(*) as count FROM feeds WHERE active = true');
    const articles = await db.query('SELECT COUNT(*) as count FROM articles');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Phase 5 migration applied',
        activeFeeds: parseInt(feeds.rows[0].count),
        articleCount: parseInt(articles.rows[0].count)
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers }
    );
  }
};
