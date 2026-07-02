// Scheduled function to fetch RSS feeds
import Parser from 'rss-parser';
import { 
  getDatabase, 
  getActiveFeeds, 
  updateFeedLastFetched, 
  insertArticle 
} from './lib/db.mjs';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

async function fetchFeed(feed) {
  try {
    console.log(`Fetching feed: ${feed.name} (${feed.url})`);
    const feedData = await parser.parseURL(feed.url);
    
    const articles = [];
    for (const item of feedData.items) {
      // Extract image URL from various possible sources
      let imageUrl = null;
      if (item.enclosure?.url) {
        imageUrl = item.enclosure.url;
      } else if (item.mediaContent?.$ ?.url) {
        imageUrl = item.mediaContent.$.url;
      } else if (item.mediaThumbnail?.$ ?.url) {
        imageUrl = item.mediaThumbnail.$.url;
      } else if (item['media:thumbnail']?.$ ?.url) {
        imageUrl = item['media:thumbnail'].$.url;
      }
      
      articles.push({
        feedId: feed.id,
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.summary || '',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid: item.guid || item.link || `${feed.id}-${item.title}-${Date.now()}`,
        author: item.creator || item.author || null,
        categories: item.categories || [],
        imageUrl: imageUrl,
        content: item.contentEncoded || item.content || null
      });
    }
    
    return { success: true, articles, feedName: feed.name };
  } catch (error) {
    console.error(`Error fetching feed ${feed.name}:`, error);
    return { success: false, error: error.message, feedName: feed.name };
  }
}

export default async (req) => {
  const startTime = Date.now();
  const results = {
    totalFeeds: 0,
    successfulFeeds: 0,
    failedFeeds: 0,
    newArticles: 0,
    errors: []
  };
  
  try {
    const db = await getDatabase();
    const feeds = await getActiveFeeds(db);
    results.totalFeeds = feeds.length;
    
    console.log(`Fetching ${feeds.length} active feeds...`);
    
    // Fetch all feeds in parallel (with some concurrency control)
    const batchSize = 5;
    for (let i = 0; i < feeds.length; i += batchSize) {
      const batch = feeds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(feed => fetchFeed(feed))
      );
      
      // Process results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const feed = batch[j];
        
        if (result.success) {
          results.successfulFeeds++;
          
          // Insert articles
          let newCount = 0;
          for (const article of result.articles) {
            const inserted = await insertArticle(db, article);
            if (inserted) {
              newCount++;
              results.newArticles++;
            }
          }
          
          console.log(`${feed.name}: ${newCount} new articles`);
          
          // Update last fetched timestamp
          await updateFeedLastFetched(db, feed.id);
        } else {
          results.failedFeeds++;
          results.errors.push({
            feed: result.feedName,
            error: result.error
          });
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`RSS fetch completed in ${duration}ms`);
    console.log(`Results: ${results.successfulFeeds}/${results.totalFeeds} feeds, ${results.newArticles} new articles`);
    
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
    console.error('RSS fetch error:', error);
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

// Run every 30 minutes
export const config = {
  schedule: "*/30 * * * *"
};
