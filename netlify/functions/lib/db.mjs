// Database helper utilities
// Works with both Netlify Database and standard Postgres connection strings

let dbClient = null;

export async function getDatabase() {
  if (dbClient) {
    return dbClient;
  }
  
  // Try Netlify Database first
  try {
    const { getDb } = await import('@netlify/database');
    dbClient = await getDb();
    return dbClient;
  } catch (error) {
    console.log('Netlify Database not available, trying standard Postgres connection...');
  }
  
  // Fall back to standard Postgres if DATABASE_URL is provided
  const connectionString = Netlify.env.get('DATABASE_URL');
  if (connectionString) {
    const pg = await import('pg');
    const { Client } = pg.default || pg;
    
    const client = new Client({ connectionString });
    await client.connect();
    
    dbClient = {
      query: async (text, params) => {
        return await client.query(text, params);
      }
    };
    
    return dbClient;
  }
  
  throw new Error('No database connection available. Set DATABASE_URL environment variable or provision Netlify Database.');
}

export async function getActiveFeeds(db) {
  const result = await db.query(
    'SELECT * FROM feeds WHERE active = true ORDER BY name'
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
       (feed_id, title, description, link, pub_date, guid, author, categories, image_url, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        article.content || null
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
    `SELECT a.*, f.name as feed_name, f.category as feed_category
     FROM articles a
     JOIN feeds f ON a.feed_id = f.id
     WHERE a.notified = false
     ORDER BY a.pub_date DESC`
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
     (user_id, push_subscription, notification_enabled, keywords, excluded_keywords, categories, countries)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      subscription.userId,
      subscription.pushSubscription,
      subscription.notificationEnabled !== false,
      subscription.keywords || [],
      subscription.excludedKeywords || [],
      subscription.categories || [],
      subscription.countries || []
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
