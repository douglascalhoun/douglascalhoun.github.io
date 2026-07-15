// API endpoint for articles with search, filters, and user state
import { getDatabase } from './lib/db.mjs';
import { cleanText } from './lib/text.mjs';
import { ensureCommentsSchema } from './lib/comments/schema.mjs';

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
    const includeFiltered = url.searchParams.get('includeFiltered') === 'true';
    const minScore = parseInt(url.searchParams.get('minScore') || '20');
    const topic = url.searchParams.get('topic');

    const db = await getDatabase();
    try {
      await ensureCommentsSchema(db);
    } catch (schemaErr) {
      console.warn('comments schema ensure skipped:', schemaErr.message);
    }
    const params = [];
    const where = [];

    let select = `
      SELECT a.*, f.name as feed_name, f.category as feed_category, f.country as feed_country,
        acs.platform as comment_platform,
        acs.status as comment_status,
        acs.comment_count,
        acs.source_thread_url as comment_thread_url,
        acs.fetched_at as comments_fetched_at
    `;
    let from = `
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      LEFT JOIN article_comment_snapshots acs ON acs.article_id = a.id
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

    // Default: only editorial-relevant articles
    if (!includeFiltered && !favoritesOnly) {
      where.push(`COALESCE(a.is_relevant, true) = true`);
      where.push(`COALESCE(a.relevance_score, 0) >= $${params.length + 1}`);
      params.push(Number.isFinite(minScore) ? minScore : 12);
    }

    if (category) {
      where.push(`f.category = $${params.length + 1}`);
      params.push(category);
    }

    const feed = url.searchParams.get('feed')?.trim()
      || url.searchParams.get('source')?.trim();
    if (feed) {
      where.push(`f.name = $${params.length + 1}`);
      params.push(feed);
    }

    if (topic) {
      where.push(`$${params.length + 1} = ANY(COALESCE(a.topics, '{}'))`);
      params.push(topic);
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

    const articles = result.rows.map((row) => ({
      ...row,
      title: cleanText(row.title),
      description: cleanText(row.description || ''),
    }));

    return new Response(
      JSON.stringify({
        articles,
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
