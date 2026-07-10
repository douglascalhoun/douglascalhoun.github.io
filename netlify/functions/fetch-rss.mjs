// Scheduled function to fetch RSS feeds with editorial scoring
import Parser from 'rss-parser';
import {
  getDatabase,
  getActiveFeeds,
  updateFeedLastFetched,
  insertArticle
} from './lib/db.mjs';
import { scoreArticle } from './lib/editorial.mjs';
import { cleanText } from './lib/text.mjs';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  },
  timeout: 15000
});

function extractImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item['media:thumbnail']?.$?.url) return item['media:thumbnail'].$.url;
  return null;
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object' && c._) return String(c._);
      return null;
    })
    .filter(Boolean)
    .slice(0, 12);
}

async function fetchFeed(feed) {
  try {
    console.log(`Fetching feed: ${feed.name} (${feed.url})`);
    const feedData = await parser.parseURL(feed.url);

    const articles = [];
    for (const item of feedData.items || []) {
      const draft = {
        feedId: feed.id,
        title: cleanText(item.title) || 'Untitled',
        description: cleanText(item.contentSnippet || item.summary || ''),
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid: item.guid || item.link || `${feed.id}-${item.title}-${Date.now()}`,
        author: item.creator || item.author || null,
        categories: normalizeCategories(item.categories),
        imageUrl: extractImage(item),
        content: item.contentEncoded || item.content || null
      };

      const scored = scoreArticle(draft, feed);
      articles.push({
        ...draft,
        imageUrl: null,
        relevanceScore: scored.score,
        isRelevant: scored.keep,
        topics: scored.topics,
        filterReasons: scored.reasons
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
    relevantNew: 0,
    filteredOut: 0,
    errors: []
  };

  try {
    const db = await getDatabase();
    const feeds = await getActiveFeeds(db);
    results.totalFeeds = feeds.length;

    console.log(`Fetching ${feeds.length} active feeds...`);

    const batchSize = 5;
    for (let i = 0; i < feeds.length; i += batchSize) {
      const batch = feeds.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((feed) => fetchFeed(feed)));

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const feed = batch[j];

        if (result.success) {
          results.successfulFeeds++;
          let newCount = 0;
          let relevantCount = 0;

          for (const article of result.articles) {
            if (!article.isRelevant) {
              results.filteredOut++;
            }
            const inserted = await insertArticle(db, article);
            if (inserted) {
              newCount++;
              results.newArticles++;
              if (article.isRelevant) {
                relevantCount++;
                results.relevantNew++;
              }
            }
          }

          console.log(`${feed.name}: ${newCount} new (${relevantCount} relevant)`);
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

export const config = {
  schedule: '*/30 * * * *'
};
