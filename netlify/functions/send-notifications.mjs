// Function to send push notifications for new articles
import webpush from 'web-push';
import { 
  getDatabase, 
  getUnnotifiedArticles, 
  getSubscriptions, 
  markArticleNotified,
  logNotification
} from './lib/db.mjs';

function matchesKeywords(article, keywords) {
  if (!keywords || keywords.length === 0) return true;
  
  const searchText = `${article.title} ${article.description}`.toLowerCase();
  return keywords.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

function matchesExcludedKeywords(article, excludedKeywords) {
  if (!excludedKeywords || excludedKeywords.length === 0) return false;
  
  const searchText = `${article.title} ${article.description}`.toLowerCase();
  return excludedKeywords.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

function matchesPreferences(article, subscription) {
  // Check excluded keywords first
  if (matchesExcludedKeywords(article, subscription.excluded_keywords)) {
    return false;
  }
  
  // Check categories filter
  if (subscription.categories && subscription.categories.length > 0) {
    if (!subscription.categories.includes(article.feed_category)) {
      return false;
    }
  }
  
  // Check countries filter
  if (subscription.countries && subscription.countries.length > 0) {
    if (!subscription.countries.includes(article.feed_country)) {
      return false;
    }
  }
  
  // Check keywords
  if (!matchesKeywords(article, subscription.keywords)) {
    return false;
  }
  
  return true;
}

export default async (req) => {
  const startTime = Date.now();
  const results = {
    totalArticles: 0,
    totalSubscriptions: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: []
  };
  
  try {
    // Set up VAPID details
    const vapidPublicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Netlify.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Netlify.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }
    
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const db = await getDatabase();
    
    // Get unnotified articles
    const articles = await getUnnotifiedArticles(db);
    results.totalArticles = articles.length;
    
    if (articles.length === 0) {
      console.log('No new articles to notify');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new articles',
          ...results
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Processing ${articles.length} articles for notifications`);
    
    // Get all active subscriptions
    const subscriptions = await getSubscriptions(db);
    results.totalSubscriptions = subscriptions.length;
    
    if (subscriptions.length === 0) {
      console.log('No active subscriptions');
      // Mark articles as notified anyway to prevent retry
      for (const article of articles) {
        await markArticleNotified(db, article.id);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active subscriptions',
          ...results
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Cap how many new articles we process per run to avoid floods
    const articlesToProcess = articles.slice(0, 40);
    results.rateLimitedSkipped = 0;

    // Preload hourly send counts for rate limiting
    const hourlyCounts = {};
    for (const subscription of subscriptions) {
      const countResult = await db.query(
        `SELECT COUNT(*) as count
         FROM notification_log
         WHERE subscription_id = $1
           AND status = 'sent'
           AND sent_at > NOW() - INTERVAL '1 hour'`,
        [subscription.id]
      );
      hourlyCounts[subscription.id] = parseInt(countResult.rows[0].count);
    }

    // Send notifications
    for (const article of articlesToProcess) {
      for (const subscription of subscriptions) {
        // Check if article matches user preferences
        if (!matchesPreferences(article, subscription)) {
          continue;
        }

        const maxPerHour = subscription.max_notifications_per_hour || 20;
        if ((hourlyCounts[subscription.id] || 0) >= maxPerHour) {
          results.rateLimitedSkipped++;
          continue;
        }
        
        const payload = JSON.stringify({
          title: `${article.feed_name}`,
          body: article.title,
          icon: article.image_url || '/icon-192.png',
          badge: '/badge-72.png',
          data: {
            url: article.link,
            articleId: article.id,
            feedName: article.feed_name
          },
          actions: [
            { action: 'open', title: 'Read' },
            { action: 'close', title: 'Dismiss' }
          ]
        });
        
        try {
          await webpush.sendNotification(
            subscription.push_subscription,
            payload
          );
          
          results.notificationsSent++;
          hourlyCounts[subscription.id] = (hourlyCounts[subscription.id] || 0) + 1;
          await logNotification(db, subscription.id, article.id, 'sent');
        } catch (error) {
          console.error(`Failed to send notification:`, error);
          results.notificationsFailed++;
          results.errors.push({
            article: article.title,
            subscription: subscription.id,
            error: error.message
          });
          
          await logNotification(db, subscription.id, article.id, 'failed');
          
          // If subscription is invalid, could mark it as inactive
          if (error.statusCode === 410) {
            console.log(`Subscription expired, marking inactive: ${subscription.id}`);
            await db.query(
              'UPDATE subscriptions SET notification_enabled = false WHERE id = $1',
              [subscription.id]
            );
          }
        }
      }
      
      // Mark article as notified
      await markArticleNotified(db, article.id);
    }

    // Mark remaining unprocessed articles as notified to avoid backlog floods
    for (const article of articles.slice(40)) {
      await markArticleNotified(db, article.id);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Notifications sent in ${duration}ms`);
    console.log(`Results: ${results.notificationsSent} sent, ${results.notificationsFailed} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        duration,
        ...results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        ...results
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Run every 15 minutes (after RSS fetch)
export const config = {
  schedule: "*/15 * * * *"
};
