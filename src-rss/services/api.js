const API_BASE = '/.netlify/functions';

export async function fetchArticles({ limit = 200, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  const response = await fetch(`${API_BASE}/articles?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
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
