// Editorial migration: relevance scoring columns + tech-first feed roster
import { getDatabase } from './lib/db.mjs';
import { EDITORIAL_FEEDS, scoreArticle } from './lib/editorial.mjs';

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

CREATE INDEX IF NOT EXISTS idx_user_article_state_user
  ON user_article_state(user_id);

CREATE INDEX IF NOT EXISTS idx_user_article_state_favorite
  ON user_article_state(user_id, is_favorite)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_articles_relevant_pub
  ON articles(pub_date DESC)
  WHERE is_relevant = true;

CREATE INDEX IF NOT EXISTS idx_articles_relevance_score
  ON articles(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
  ON notification_log(subscription_id, sent_at DESC);
`;

const RETIRE_URL_PATTERNS = [
  '%cnn.com%',
  '%npr.org%',
  '%nytimes.com%',
  '%washingtonpost.com%',
  '%aljazeera.com%',
  '%theguardian.com%',
  '%spiegel.de%',
  '%elpais.com%',
  '%scmp.com%',
  '%japantimes%',
  '%reuters.com%',
  '%rsshub.app%'
];

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

    // Retire broad general-news feeds that flood incremental politics
    let retired = 0;
    for (const pattern of RETIRE_URL_PATTERNS) {
      const result = await db.query(
        `UPDATE feeds SET active = false WHERE url ILIKE $1 AND active = true RETURNING id`,
        [pattern]
      );
      retired += result.rowCount || 0;
    }

    // Upsert editorial roster
    let upserted = 0;
    for (const feed of EDITORIAL_FEEDS) {
      // Skip known-flaky sources
      if (feed.url.includes('rsshub.app') || feed.url.includes('meta.com/blog')) continue;
      if (feed.url.includes('ft.com') || feed.url.includes('dj.com')) continue; // often blocked/paywalled

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

    // Keep BBC world as the selective geopolitics source
    await db.query(
      `UPDATE feeds SET active = true, category = 'world', priority = 5
       WHERE url = 'https://feeds.bbci.co.uk/news/world/rss.xml'`
    );

    // Retire leftover non-roster sources that may have been added earlier
    await db.query(
      `UPDATE feeds SET active = false
       WHERE name IN ('The Economist', 'FT Technology', 'WSJ Tech', 'AP Top News', 'Meta Quest Blog')
          OR url ILIKE '%economist.com%'
          OR url ILIKE '%ft.com%'
          OR url ILIKE '%dj.com%'`
    );

    // Re-score recent articles with new editorial model
    const recent = await db.query(
      `SELECT a.id, a.title, a.description, a.categories, f.category, f.priority, f.active
       FROM articles a
       JOIN feeds f ON f.id = a.feed_id
       ORDER BY a.pub_date DESC NULLS LAST
       LIMIT 2500`
    );

    let rescored = 0;
    let kept = 0;
    for (const row of recent.rows) {
      const result = scoreArticle(row, { category: row.category, priority: row.priority });
      // Articles from retired feeds are hidden unless they still score as high-impact tech/events
      const keep = row.active ? result.keep : (result.keep && result.score >= 28 && (result.topics.includes('ai') || result.topics.includes('vr') || result.topics.includes('tech')));
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

    // Hide remaining articles from inactive feeds that were never rescored
    await db.query(
      `UPDATE articles a
       SET is_relevant = false,
           filter_reasons = ARRAY['retired_source']
       FROM feeds f
       WHERE a.feed_id = f.id
         AND f.active = false
         AND COALESCE(a.is_relevant, true) = true
         AND COALESCE(a.relevance_score, 0) < 28`
    );

    const feeds = await db.query(
      `SELECT name, category, active, priority FROM feeds ORDER BY active DESC, priority DESC NULLS LAST, name`
    );
    const relevantCount = await db.query(
      `SELECT COUNT(*) as count FROM articles WHERE is_relevant = true`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Editorial migration applied',
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
    console.error('Editorial migration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers }
    );
  }
};
