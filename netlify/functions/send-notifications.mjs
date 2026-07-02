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
    
    // Send notifications
    for (const article of articles) {
      for (const subscription of subscriptions) {
        // Check if article matches user preferences
        if (!matchesPreferences(article, subscription)) {
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
