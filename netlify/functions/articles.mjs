// API endpoint for articles with search, filters, and user state
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q')?.trim();
    const favoritesOnly = url.searchParams.get('favorites') === 'true';
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const userId = url.searchParams.get('userId');

    const db = await getDatabase();
    const params = [];
    const where = [];

    let select = `
      SELECT a.*, f.name as feed_name, f.category as feed_category, f.country as feed_country
    `;
    let from = `
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
    `;

    if (userId) {
      select += `,
        COALESCE(uas.is_read, false) as is_read,
        COALESCE(uas.is_favorite, false) as is_favorite
      `;
      from += `
        LEFT JOIN user_article_state uas
          ON uas.article_id = a.id AND uas.user_id = $${params.length + 1}
      `;
      params.push(userId);
    } else {
      select += `,
        false as is_read,
        false as is_favorite
      `;
    }

    if (category) {
      where.push(`f.category = $${params.length + 1}`);
      params.push(category);
    }

    if (q) {
      where.push(`(
        a.title ILIKE $${params.length + 1}
        OR a.description ILIKE $${params.length + 1}
        OR f.name ILIKE $${params.length + 1}
      )`);
      params.push(`%${q}%`);
    }

    if (favoritesOnly && userId) {
      where.push(`COALESCE(uas.is_favorite, false) = true`);
    }

    if (unreadOnly && userId) {
      where.push(`COALESCE(uas.is_read, false) = false`);
    }

    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const query = `
      ${select}
      ${from}
      ${whereSql}
      ORDER BY a.pub_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const queryParams = [...params, limit, offset];
    const result = await db.query(query, queryParams);

    const countQuery = `
      SELECT COUNT(*) as total
      ${from}
      ${whereSql}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    return new Response(
      JSON.stringify({
        articles: result.rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching articles:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
