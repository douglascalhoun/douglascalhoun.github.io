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

export function markManyRead(idList) {
  const ids = getReadIds();
  idList.forEach((id) => ids.add(id));
  saveJson(READ_KEY, [...ids]);
  return ids;
}

export function getCachedStories() {
  const cache = loadJson(CACHE_KEY, { stories: [], updatedAt: null });
  return Array.isArray(cache.stories) ? cache.stories : [];
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
      title: story.title,
      description: story.description || '',
      link: story.link,
      pub_date: story.pub_date,
      feed_name: story.feed_name,
      feed_category: story.feed_category,
      relevance_score: story.relevance_score
    });
  }

  const stories = [...byId.values()].sort((a, b) => {
    const tb = new Date(b.pub_date || 0).getTime();
    const ta = new Date(a.pub_date || 0).getTime();
    return tb - ta;
  });

  // Keep cache bounded
  const trimmed = stories.slice(0, 500);
  saveJson(CACHE_KEY, { stories: trimmed, updatedAt: new Date().toISOString() });
  return trimmed;
}

export function getUnreadStories() {
  const read = getReadIds();
  return getCachedStories().filter((s) => !read.has(s.id));
}
