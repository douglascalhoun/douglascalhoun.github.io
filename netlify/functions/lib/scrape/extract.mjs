import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { stripHtml, cleanText } from '../text.mjs';

const BLOCKED_HOST_HINTS = [
  /datadome/i,
  /captcha/i,
  /please enable cookies/i,
  /access denied/i,
  /subscribe to continue/i,
  /create a free account/i
];

/**
 * Extract the best publicly available article text from HTML.
 * Prefers Mozilla Readability; falls back to common content selectors + RSS body.
 */
export function extractArticleFromHtml(html, { url = '', rssContent = '', description = '' } = {}) {
  if (!html || html.length < 200) {
    return fallbackFromRss({ rssContent, description, reason: 'empty_html' });
  }

  const lower = html.slice(0, 8000).toLowerCase();
  if (BLOCKED_HOST_HINTS.some((re) => re.test(lower)) && html.length < 12000) {
    return fallbackFromRss({ rssContent, description, reason: 'blocked_or_paywall_shell' });
  }

  try {
    const { document } = parseHTML(html);
    // linkedom documents work with Readability
    const reader = new Readability(document, { charThreshold: 200 });
    const article = reader.parse();
    if (article?.textContent && article.textContent.trim().length > 280) {
      const body = cleanText(article.textContent).slice(0, 48000);
      const excerpt = cleanText(article.excerpt || body.slice(0, 420));
      return {
        ok: true,
        status: 'ok',
        title: cleanText(article.title || ''),
        body,
        excerpt,
        byline: cleanText(article.byline || ''),
        length: body.length,
        method: 'readability',
        sourceUrl: url
      };
    }
  } catch {
    // fall through
  }

  // Selector fallback for sites Readability misses
  try {
    const { document } = parseHTML(html);
    const selectors = [
      'article',
      '[itemprop="articleBody"]',
      '.article-body',
      '.story-body',
      '.StoryBodyCompanionColumn',
      '#article-body',
      '.paywall',
      'main'
    ];
    for (const sel of selectors) {
      const node = document.querySelector(sel);
      if (!node) continue;
      const text = cleanText(node.textContent || '');
      if (text.length > 280) {
        return {
          ok: true,
          status: 'partial',
          title: '',
          body: text.slice(0, 48000),
          excerpt: text.slice(0, 420),
          byline: '',
          length: Math.min(text.length, 48000),
          method: `selector:${sel}`,
          sourceUrl: url
        };
      }
    }
  } catch {
    // fall through
  }

  return fallbackFromRss({ rssContent, description, reason: 'extract_failed' });
}

function fallbackFromRss({ rssContent, description, reason }) {
  const fromEncoded = cleanText(stripHtml(rssContent || ''));
  const fromDesc = cleanText(description || '');
  const body = (fromEncoded.length >= fromDesc.length ? fromEncoded : fromDesc).slice(0, 24000);
  if (body.length >= 80) {
    return {
      ok: true,
      status: 'rss_only',
      title: '',
      body,
      excerpt: body.slice(0, 420),
      byline: '',
      length: body.length,
      method: `rss:${reason}`,
      sourceUrl: ''
    };
  }
  return {
    ok: false,
    status: 'failed',
    title: '',
    body: '',
    excerpt: '',
    byline: '',
    length: 0,
    method: reason,
    sourceUrl: '',
    error: reason
  };
}
