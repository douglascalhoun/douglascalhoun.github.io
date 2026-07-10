// Database helper utilities for standard Postgres (DATABASE_URL)
import pg from 'pg';

const { Client } = pg;
let dbClient = null;

export async function getDatabase() {
  if (dbClient) {
    return dbClient;
  }

  const connectionString = Netlify.env.get('DATABASE_URL');
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set. Please configure a Postgres database connection.');
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : undefined
  });
  await client.connect();

  dbClient = {
    query: async (text, params) => client.query(text, params)
  };

  return dbClient;
}

export async function getActiveFeeds(db) {
  const result = await db.query(
    `SELECT * FROM feeds
     WHERE active = true
     ORDER BY COALESCE(priority, 5) DESC, name`
  );
  return result.rows;
}

export async function getFeedById(db, feedId) {
  const result = await db.query(
    'SELECT * FROM feeds WHERE id = $1',
    [feedId]
  );
  return result.rows[0];
}

export async function updateFeedLastFetched(db, feedId) {
  await db.query(
    'UPDATE feeds SET last_fetched_at = NOW() WHERE id = $1',
    [feedId]
  );
}

export async function insertArticle(db, article) {
  try {
    const result = await db.query(
      `INSERT INTO articles 
       (feed_id, title, description, link, pub_date, guid, author, categories, image_url, content,
        relevance_score, is_relevant, topics, filter_reasons)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (guid) DO NOTHING
       RETURNING id`,
      [
        article.feedId,
        article.title,
        article.description || '',
        article.link,
        article.pubDate,
        article.guid,
        article.author || null,
        article.categories || [],
        article.imageUrl || null,
        article.content || null,
        article.relevanceScore ?? 0,
        article.isRelevant !== false,
        article.topics || [],
        article.filterReasons || []
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting article:', error);
    return null;
  }
}

export async function getRecentArticles(db, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT a.*, f.name as feed_name, f.category as feed_category
     FROM articles a
     JOIN feeds f ON a.feed_id = f.id
     ORDER BY a.pub_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function getUnnotifiedArticles(db) {
  const result = await db.query(
    `SELECT a.*, f.name as feed_name, f.category as feed_category, f.country as feed_country, f.priority as feed_priority
     FROM articles a
     JOIN feeds f ON a.feed_id = f.id
     WHERE a.notified = false
       AND COALESCE(a.is_relevant, true) = true
       AND COALESCE(a.relevance_score, 0) >= 28
     ORDER BY a.relevance_score DESC, a.pub_date DESC
     LIMIT 100`
  );
  return result.rows;
}

export async function markArticleNotified(db, articleId) {
  await db.query(
    'UPDATE articles SET notified = true WHERE id = $1',
    [articleId]
  );
}

export async function getSubscriptions(db) {
  const result = await db.query(
    'SELECT * FROM subscriptions WHERE notification_enabled = true'
  );
  return result.rows;
}

export async function insertSubscription(db, subscription) {
  const result = await db.query(
    `INSERT INTO subscriptions 
     (user_id, push_subscription, notification_enabled, keywords, excluded_keywords, categories, countries, max_notifications_per_hour)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      subscription.userId,
      subscription.pushSubscription,
      subscription.notificationEnabled !== false,
      subscription.keywords || [],
      subscription.excludedKeywords || [],
      subscription.categories || [],
      subscription.countries || [],
      subscription.maxNotificationsPerHour || 20
    ]
  );
  return result.rows[0];
}

export async function logNotification(db, subscriptionId, articleId, status = 'sent') {
  await db.query(
    `INSERT INTO notification_log (subscription_id, article_id, status)
     VALUES ($1, $2, $3)`,
    [subscriptionId, articleId, status]
  );
}
