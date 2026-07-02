// API endpoint for articles
import { getDatabase, getRecentArticles } from './lib/db.mjs';

export default async (req) => {
  // Enable CORS
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
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    
    const db = await getDatabase();
    
    let query = `
      SELECT a.*, f.name as feed_name, f.category as feed_category, f.country as feed_country
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
    `;
    
    const params = [];
    if (category) {
      query += ` WHERE f.category = $${params.length + 1}`;
      params.push(category);
    }
    
    query += ` ORDER BY a.pub_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM articles a JOIN feeds f ON a.feed_id = f.id';
    const countParams = [];
    if (category) {
      countQuery += ' WHERE f.category = $1';
      countParams.push(category);
    }
    const countResult = await db.query(countQuery, countParams);
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
