// Scrape publicly visible article text into Postgres
import { getDatabase } from './lib/db.mjs';
import { ensurePresenterSchema } from './lib/presenter/schema.mjs';
import {
  listArticlesNeedingScrape,
  scrapeArticleUrl,
  saveScrapeResult
} from './lib/scrape/index.mjs';
import { corsHeaders, handleOptions, jsonResponse } from './lib/cors.mjs';

export default async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const start = Date.now();
  const url = new URL(req.url);
  // Scheduled functions only get ~30s — keep batches small by default.
  const defaultLimit = req.headers.get('x-netlify-event') === 'schedule' ? 6 : 12;
  const limit = Math.min(Number(url.searchParams.get('limit') || defaultLimit), 40);

  try {
    const db = await getDatabase();
    await ensurePresenterSchema(db);

    const pending = await listArticlesNeedingScrape(db, { limit });
    const results = {
      attempted: 0,
      ok: 0,
      partial: 0,
      rssOnly: 0,
      failed: 0,
      items: []
    };

    for (const article of pending) {
      results.attempted += 1;
      const scrape = await scrapeArticleUrl(article.link, {
        rssContent: article.content || '',
        description: article.description || ''
      });
      await saveScrapeResult(db, article.id, scrape);

      if (scrape.status === 'ok') results.ok += 1;
      else if (scrape.status === 'partial') results.partial += 1;
      else if (scrape.status === 'rss_only') results.rssOnly += 1;
      else results.failed += 1;

      results.items.push({
        id: article.id,
        title: article.title,
        status: scrape.status,
        method: scrape.method,
        length: scrape.length || 0
      });
    }

    return jsonResponse({
      ...results,
      durationMs: Date.now() - start
    });
  } catch (error) {
    console.error('scrape-articles error', error);
    return jsonResponse(
      { error: error.message || 'scrape failed' },
      { status: 500 }
    );
  }
};

export const config = {
  schedule: '15,45 * * * *'
};
