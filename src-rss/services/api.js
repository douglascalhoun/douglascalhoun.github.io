const API_BASE = '/.netlify/functions';

export async function fetchArticles({
  limit = 100,
  offset = 0,
  feed = null,
  minScore = null
} = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (feed) params.set('feed', feed);
  if (minScore != null) params.set('minScore', String(minScore));
  const response = await fetch(`${API_BASE}/articles?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchFeeds() {
  const response = await fetch(`${API_BASE}/feeds`);
  if (!response.ok) {
    throw new Error(`Failed to fetch feeds: ${response.statusText}`);
  }
  return response.json();
}

export async function triggerFetch() {
  const response = await fetch(`${API_BASE}/fetch-rss`);
  if (!response.ok) {
    throw new Error(`Failed to crawl sources: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchArticleComments(articleId, { refresh = false } = {}) {
  const params = new URLSearchParams({ id: articleId });
  if (refresh) params.set('refresh', '1');
  const response = await fetch(`${API_BASE}/article-comments?${params}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Failed to fetch comments: ${response.statusText}`);
  }
  return response.json();
}
