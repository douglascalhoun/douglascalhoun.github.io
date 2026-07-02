// API endpoint for feeds
import { getDatabase } from './lib/db.mjs';

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
    const db = await getDatabase();
    
    // Get all feeds with article counts
    const result = await db.query(`
      SELECT 
        f.*,
        COUNT(a.id) as article_count,
        MAX(a.pub_date) as latest_article_date
      FROM feeds f
      LEFT JOIN articles a ON f.id = a.feed_id
      GROUP BY f.id
      ORDER BY f.name
    `);
    
    // Group by category
    const feedsByCategory = {};
    const categories = new Set();
    
    result.rows.forEach(feed => {
      categories.add(feed.category);
      if (!feedsByCategory[feed.category]) {
        feedsByCategory[feed.category] = [];
      }
      feedsByCategory[feed.category].push(feed);
    });
    
    return new Response(
      JSON.stringify({
        feeds: result.rows,
        feedsByCategory,
        categories: Array.from(categories).sort(),
        totalFeeds: result.rows.length
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
