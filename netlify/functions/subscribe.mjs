// API endpoint for push notification subscriptions
import { getDatabase, insertSubscription } from './lib/db.mjs';

export default async (req) => {
  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }
  
  try {
    const body = await req.json();
    const { userId, subscription, preferences } = body;
    
    if (!userId || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, subscription' }),
        { status: 400, headers }
      );
    }
    
    const db = await getDatabase();
    
    // Check if subscription already exists
    const existing = await db.query(
      'SELECT id FROM subscriptions WHERE user_id = $1',
      [userId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing subscription
      await db.query(
        `UPDATE subscriptions 
         SET push_subscription = $1, 
             keywords = $2,
             excluded_keywords = $3,
             categories = $4,
             countries = $5,
             updated_at = NOW()
         WHERE user_id = $6`,
        [
          subscription,
          preferences?.keywords || [],
          preferences?.excludedKeywords || [],
          preferences?.categories || [],
          preferences?.countries || [],
          userId
        ]
      );
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription updated',
          subscriptionId: existing.rows[0].id
        }),
        { status: 200, headers }
      );
    } else {
      // Create new subscription
      const result = await insertSubscription(db, {
        userId,
        pushSubscription: subscription,
        notificationEnabled: true,
        keywords: preferences?.keywords || [],
        excludedKeywords: preferences?.excludedKeywords || [],
        categories: preferences?.categories || [],
        countries: preferences?.countries || []
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription created',
          subscriptionId: result.id
        }),
        { status: 201, headers }
      );
    }
  } catch (error) {
    console.error('Error handling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
