import { cleanText } from './text';

const READ_KEY = 'worldwire_read_ids';
const CACHE_KEY = 'worldwire_story_cache';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getReadIds() {
  const ids = loadJson(READ_KEY, []);
  return new Set(Array.isArray(ids) ? ids : []);
}

export function markRead(id) {
  const ids = getReadIds();
  ids.add(id);
  saveJson(READ_KEY, [...ids]);
  return ids;
}

export function markUnread(id) {
  const ids = getReadIds();
  ids.delete(id);
  saveJson(READ_KEY, [...ids]);
  return ids;
}

export function markManyRead(idList) {
  const ids = getReadIds();
  idList.forEach((id) => ids.add(id));
  saveJson(READ_KEY, [...ids]);
  return ids;
}

export function markManyUnread(idList) {
  const ids = getReadIds();
  idList.forEach((id) => ids.delete(id));
  saveJson(READ_KEY, [...ids]);
  return ids;
}

function pruneReadIds(storyIds) {
  const valid = new Set(storyIds);
  const next = [...getReadIds()].filter((id) => valid.has(id));
  saveJson(READ_KEY, next);
}

export function getCachedStories() {
  const cache = loadJson(CACHE_KEY, { stories: [], updatedAt: null });
  const stories = Array.isArray(cache.stories) ? cache.stories : [];
  return stories.map((story) => ({
    ...story,
    title: cleanText(story?.title || ''),
    description: cleanText(story?.description || ''),
  }));
}

export function getCacheUpdatedAt() {
  const cache = loadJson(CACHE_KEY, { stories: [], updatedAt: null });
  return cache.updatedAt || null;
}

function rankScore(story) {
  const relevance = Number(story.relevance_score) || 0;
  const ageHours = Math.max(
    0,
    (Date.now() - new Date(story.pub_date || 0).getTime()) / 36e5
  );
  // Prefer consequential + recent; fade after ~2 days
  const recency = Math.max(0, 48 - ageHours) * 0.35;
  return relevance + recency;
}

export function mergeStoriesIntoCache(incoming) {
  const byId = new Map();
  for (const story of getCachedStories()) {
    if (story?.id) byId.set(story.id, story);
  }
  for (const story of incoming || []) {
    if (!story?.id) continue;
    byId.set(story.id, {
      id: story.id,
      title: cleanText(story.title),
      description: cleanText(story.description || ''),
      link: story.link,
      pub_date: story.pub_date,
      feed_name: story.feed_name,
      feed_category: story.feed_category,
      relevance_score: story.relevance_score,
      topics: Array.isArray(story.topics) ? story.topics : [],
    });
  }

  const stories = [...byId.values()].sort((a, b) => {
    const tb = new Date(b.pub_date || 0).getTime();
    const ta = new Date(a.pub_date || 0).getTime();
    return tb - ta;
  });

  const trimmed = stories.slice(0, 500);
  pruneReadIds(trimmed.map((s) => s.id));
  saveJson(CACHE_KEY, { stories: trimmed, updatedAt: new Date().toISOString() });
  return trimmed;
}

export function getUnreadStories() {
  const read = getReadIds();
  return getCachedStories()
    .filter((s) => !read.has(s.id))
    .sort((a, b) => rankScore(b) - rankScore(a));
}

export function getStoryCounts() {
  const cached = getCachedStories();
  const read = getReadIds();
  let unread = 0;
  let readCount = 0;
  for (const story of cached) {
    if (read.has(story.id)) readCount += 1;
    else unread += 1;
  }
  return {
    total: cached.length,
    unread,
    read: readCount,
  };
}
