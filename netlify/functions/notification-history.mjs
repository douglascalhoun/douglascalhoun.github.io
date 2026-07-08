// Notification history API
import { getDatabase } from './lib/db.mjs';

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const db = await getDatabase();

    let query;
    let params;

    if (userId) {
      query = `
        SELECT nl.id, nl.sent_at, nl.status,
               a.id as article_id, a.title, a.link, a.description, a.image_url,
               f.name as feed_name, f.category as feed_category
        FROM notification_log nl
        JOIN subscriptions s ON s.id = nl.subscription_id
        JOIN articles a ON a.id = nl.article_id
        JOIN feeds f ON f.id = a.feed_id
        WHERE s.user_id = $1
        ORDER BY nl.sent_at DESC
        LIMIT $2
      `;
      params = [userId, limit];
    } else {
      query = `
        SELECT nl.id, nl.sent_at, nl.status,
               a.id as article_id, a.title, a.link, a.description, a.image_url,
               f.name as feed_name, f.category as feed_category
        FROM notification_log nl
        JOIN articles a ON a.id = nl.article_id
        JOIN feeds f ON f.id = a.feed_id
        ORDER BY nl.sent_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const result = await db.query(query, params);

    return new Response(
      JSON.stringify({ notifications: result.rows }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Notification history error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
