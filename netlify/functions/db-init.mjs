// Database initialization function
import { getDb } from '@netlify/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (req) => {
  try {
    const db = await getDb();
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await db.query(schema);
    
    // Read seed data
    const seedPath = path.join(__dirname, '../../db/seed-feeds.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');
    
    // Execute seed data (ignore duplicates)
    try {
      await db.query(seedData);
    } catch (error) {
      // Ignore duplicate key errors from re-running seed
      if (!error.message.includes('duplicate key')) {
        throw error;
      }
    }
    
    // Get feed count
    const result = await db.query('SELECT COUNT(*) as count FROM feeds');
    const feedCount = result.rows[0].count;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database initialized successfully',
        feedCount: parseInt(feedCount)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Database initialization error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
