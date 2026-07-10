// Fast batch rescore for editorial filter updates
import { getDatabase } from './lib/db.mjs';
import { scoreArticle } from './lib/editorial.mjs';

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
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '400'), 800);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const db = await getDatabase();
    const recent = await db.query(
      `SELECT a.id, a.title, a.description, a.categories, f.category, f.priority, f.active
       FROM articles a
       JOIN feeds f ON f.id = a.feed_id
       ORDER BY a.pub_date DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    let kept = 0;
    let dropped = 0;
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
      if (keep) kept += 1;
      else dropped += 1;
    }

    const relevantTotal = await db.query(
      `SELECT COUNT(*) as count FROM articles WHERE is_relevant = true`
    );

    return new Response(
      JSON.stringify({
        success: true,
        offset,
        limit,
        processed: recent.rows.length,
        kept,
        dropped,
        relevantTotal: parseInt(relevantTotal.rows[0].count),
        hasMore: recent.rows.length === limit
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Rescore error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers }
    );
  }
};
