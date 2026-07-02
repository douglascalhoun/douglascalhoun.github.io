// API client for backend functions
const API_BASE = '/.netlify/functions';

export async function fetchArticles(category = null, limit = 50, offset = 0) {
  const params = new URLSearchParams({ limit, offset });
  if (category) {
    params.append('category', category);
  }
  
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
