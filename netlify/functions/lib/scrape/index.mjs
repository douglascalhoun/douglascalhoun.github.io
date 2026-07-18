import { fetchText } from '../comments/http.mjs';
import { extractArticleFromHtml } from './extract.mjs';

const SCRAPE_UA =
  'Mozilla/5.0 (compatible; WorldwireReader/1.0; +https://rss-news-aggregator.netlify.app)';

/**
 * Scrape one article URL for publicly visible text.
 */
export async function scrapeArticleUrl(url, { rssContent = '', description = '' } = {}) {
  if (!url) {
    return extractArticleFromHtml('', { rssContent, description });
  }

  let result;
  try {
    result = await fetchText(url, {
      timeoutMs: 16000,
      headers: {
        'User-Agent': SCRAPE_UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    const fallback = extractArticleFromHtml('', { rssContent, description, url });
    return {
      ...fallback,
      status: fallback.ok ? fallback.status : 'failed',
      error: error.message || 'fetch_failed'
    };
  }

  if (!result.ok) {
    const fallback = extractArticleFromHtml('', { rssContent, description, url });
    return {
      ...fallback,
      status: fallback.ok ? fallback.status : 'failed',
      httpStatus: result.status,
      error: `http_${result.status}`
    };
  }

  const extracted = extractArticleFromHtml(result.text, {
    url: result.url || url,
    rssContent,
    description
  });

  return {
    ...extracted,
    httpStatus: result.status,
    finalUrl: result.url
  };
}

/**
 * Persist scrape result onto an articles row.
 */
export async function saveScrapeResult(db, articleId, scrape) {
  await db.query(
    `UPDATE articles
     SET scraped_body = $2,
         scraped_excerpt = $3,
         scrape_status = $4,
         scrape_error = $5,
         scraped_at = NOW(),
         content = COALESCE(NULLIF(content, ''), $2)
     WHERE id = $1`,
    [
      articleId,
      scrape.body || null,
      scrape.excerpt || null,
      scrape.status || 'failed',
      scrape.error || null
    ]
  );
}

/**
 * Pull articles that still need scraping.
 */
export async function listArticlesNeedingScrape(db, { limit = 20 } = {}) {
  const result = await db.query(
    `SELECT id, title, link, description, content, scrape_status
     FROM articles
     WHERE COALESCE(is_relevant, true) = true
       AND (
         scrape_status IS NULL
         OR scrape_status IN ('pending', 'failed')
         OR (scrape_status = 'rss_only' AND scraped_at < NOW() - INTERVAL '12 hours')
       )
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY COALESCE(relevance_score, 0) DESC, pub_date DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
