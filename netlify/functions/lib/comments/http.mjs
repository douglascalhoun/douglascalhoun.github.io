const DEFAULT_UA =
  'Mozilla/5.0 (compatible; WorldwireComments/1.0; +https://rss-news-aggregator.netlify.app)';

/**
 * Fetch HTML/JSON from publisher endpoints with browser-like headers.
 */
export async function fetchText(url, { accept = 'text/html,application/xhtml+xml', timeoutMs = 18000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: accept,
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers
      }
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      text,
      contentType: response.headers.get('content-type') || ''
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, options = {}) {
  const result = await fetchText(url, {
    accept: 'application/json,text/javascript,*/*;q=0.8',
    ...options
  });
  if (!result.ok) {
    return { ...result, data: null };
  }
  try {
    return { ...result, data: JSON.parse(result.text) };
  } catch (error) {
    return { ...result, ok: false, data: null, parseError: error.message };
  }
}
