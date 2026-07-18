import { getUserId } from './identity';

const API_BASE = '/.netlify/functions';

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': getUserId(),
    ...extra
  };
}

export async function fetchPreferences() {
  const response = await fetch(
    `${API_BASE}/presenter-prefs?userId=${encodeURIComponent(getUserId())}`,
    { headers: headers() }
  );
  if (!response.ok) throw new Error('Failed to load preferences');
  return response.json();
}

export async function savePreferences(payload) {
  const response = await fetch(`${API_BASE}/presenter-prefs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userId: getUserId(), ...payload })
  });
  if (!response.ok) throw new Error('Failed to save preferences');
  return response.json();
}

export async function fetchDigest({ force = false, markVisit = true } = {}) {
  const response = await fetch(`${API_BASE}/presenter-digest`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      userId: getUserId(),
      force,
      markVisit
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to build digest');
  }
  return response.json();
}

export async function fetchChatHistory() {
  const response = await fetch(
    `${API_BASE}/presenter-chat?userId=${encodeURIComponent(getUserId())}`,
    { headers: headers() }
  );
  if (!response.ok) throw new Error('Failed to load chat');
  return response.json();
}

export async function sendChatMessage(message) {
  const response = await fetch(`${API_BASE}/presenter-chat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userId: getUserId(), message })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Chat failed');
  }
  return response.json();
}

export async function triggerScrape(limit = 10) {
  const response = await fetch(`${API_BASE}/scrape-articles?limit=${limit}`);
  if (!response.ok) throw new Error('Scrape failed');
  return response.json();
}
