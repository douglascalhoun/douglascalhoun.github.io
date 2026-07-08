// API client for backend functions
const API_BASE = '/.netlify/functions';

export async function fetchArticles({
  category = null,
  limit = 50,
  offset = 0,
  q = null,
  favorites = false,
  unread = false,
  userId = null
} = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (category) params.append('category', category);
  if (q) params.append('q', q);
  if (favorites) params.append('favorites', 'true');
  if (unread) params.append('unread', 'true');
  if (userId) params.append('userId', userId);

  const response = await fetch(`${API_BASE}/articles?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchFeeds() {
  const response = await fetch(`${API_BASE}/feeds`);
  if (!response.ok) {
    throw new Error(`Failed to fetch feeds: ${response.statusText}`);
  }

  return await response.json();
}

export async function subscribe(userId, subscription, preferences) {
  const response = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      subscription,
      preferences
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to subscribe: ${response.statusText}`);
  }

  return await response.json();
}

export async function getVapidPublicKey() {
  const response = await fetch(`${API_BASE}/vapid-public-key`);
  if (!response.ok) {
    throw new Error(`Failed to get VAPID key: ${response.statusText}`);
  }

  const data = await response.json();
  return data.publicKey;
}

export async function updateArticleState(userId, articleId, { isRead, isFavorite }) {
  const response = await fetch(`${API_BASE}/article-state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, articleId, isRead, isFavorite })
  });

  if (!response.ok) {
    throw new Error(`Failed to update article state: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchNotificationHistory(userId, limit = 50) {
  const params = new URLSearchParams({ limit });
  if (userId) params.append('userId', userId);

  const response = await fetch(`${API_BASE}/notification-history?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch notification history: ${response.statusText}`);
  }

  return await response.json();
}
