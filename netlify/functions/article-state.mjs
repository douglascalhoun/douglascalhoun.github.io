// API for marking articles as read / favorite
import { getDatabase } from './lib/db.mjs';

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const db = await getDatabase();

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId required' }),
          { status: 400, headers }
        );
      }

      const result = await db.query(
        `SELECT article_id, is_read, is_favorite, updated_at
         FROM user_article_state
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 500`,
        [userId]
      );

      return new Response(
        JSON.stringify({ states: result.rows }),
        { status: 200, headers }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { userId, articleId, isRead, isFavorite } = body;

      if (!userId || !articleId) {
        return new Response(
          JSON.stringify({ error: 'userId and articleId required' }),
          { status: 400, headers }
        );
      }

      const result = await db.query(
        `INSERT INTO user_article_state (user_id, article_id, is_read, is_favorite, updated_at)
         VALUES ($1, $2, COALESCE($3, false), COALESCE($4, false), NOW())
         ON CONFLICT (user_id, article_id)
         DO UPDATE SET
           is_read = COALESCE($3, user_article_state.is_read),
           is_favorite = COALESCE($4, user_article_state.is_favorite),
           updated_at = NOW()
         RETURNING *`,
        [userId, articleId, isRead ?? null, isFavorite ?? null]
      );

      return new Response(
        JSON.stringify({ success: true, state: result.rows[0] }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  } catch (error) {
    console.error('Article state error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
