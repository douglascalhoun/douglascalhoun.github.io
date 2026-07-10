// Sync editorial feed roster and rescore articles
import { getDatabase } from './lib/db.mjs';
import { EDITORIAL_FEEDS, RETIRE_NAME_PATTERNS, scoreArticle } from './lib/editorial.mjs';

const MIGRATION_SQL = `
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS max_notifications_per_hour INTEGER DEFAULT 12;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS filter_reasons TEXT[] DEFAULT '{}';

ALTER TABLE feeds
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;

CREATE TABLE IF NOT EXISTS user_article_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_articles_relevant_pub
  ON articles(pub_date DESC)
  WHERE is_relevant = true;
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

    // Deactivate non-news / retired sources
    let retired = 0;
    for (const name of RETIRE_NAME_PATTERNS) {
      const result = await db.query(
        `UPDATE feeds SET active = false WHERE name ILIKE $1 AND active = true RETURNING id`,
        [`%${name}%`]
      );
      retired += result.rowCount || 0;
    }

    await db.query(
      `UPDATE feeds SET active = false
       WHERE url ILIKE '%openai.com%'
          OR url ILIKE '%deepmind%'
          OR url ILIKE '%blog.google%'
          OR url ILIKE '%meta.com/blog%'
          OR url ILIKE '%hnrss.org%'
          OR url ILIKE '%uploadvr%'
          OR url ILIKE '%roadtovr%'
          OR url ILIKE '%venturebeat%'`
    );

    let upserted = 0;
    for (const feed of EDITORIAL_FEEDS) {
      await db.query(
        `INSERT INTO feeds (name, url, category, country, language, active, priority)
         VALUES ($1, $2, $3, $4, 'en', true, $5)
         ON CONFLICT (url) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           country = EXCLUDED.country,
           active = true,
           priority = EXCLUDED.priority`,
        [feed.name, feed.url, feed.category, feed.country, feed.priority]
      );
      upserted++;
    }

    const recent = await db.query(
      `SELECT a.id, a.title, a.description, a.categories, f.category, f.priority, f.active
       FROM articles a
       JOIN feeds f ON f.id = a.feed_id
       ORDER BY a.pub_date DESC NULLS LAST
       LIMIT 2000`
    );

    let rescored = 0;
    let kept = 0;
    for (const row of recent.rows) {
      const result = scoreArticle(row, { category: row.category, priority: row.priority });
      const keep = row.active ? result.keep : false;
      await db.query(
        `UPDATE articles
         SET relevance_score = $1,
             is_relevant = $2,
             topics = $3,
             filter_reasons = $4
         WHERE id = $5`,
        [result.score, keep, result.topics, result.reasons, row.id]
      );
      rescored++;
      if (keep) kept++;
    }

    await db.query(
      `UPDATE articles a
       SET is_relevant = false
       FROM feeds f
       WHERE a.feed_id = f.id AND f.active = false`
    );

    const feeds = await db.query(
      `SELECT name, category, active, priority, url FROM feeds
       WHERE active = true
       ORDER BY priority DESC, name`
    );

    const relevantCount = await db.query(
      `SELECT COUNT(*) as count FROM articles WHERE is_relevant = true`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Newsroom roster applied',
        retiredFeeds: retired,
        upsertedFeeds: upserted,
        rescoredArticles: rescored,
        relevantKept: kept,
        relevantTotal: parseInt(relevantCount.rows[0].count),
        feeds: feeds.rows
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
