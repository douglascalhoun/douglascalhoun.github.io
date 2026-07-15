/**
 * Canonical Worldwire source roster + stable URL slugs.
 * Keep in sync with EDITORIAL_FEEDS in netlify/functions/lib/editorial.mjs
 */

export const SOURCES = [
  {
    name: 'Financial Times',
    slug: 'financial-times',
    category: 'world',
    country: 'UK',
    comments: false
  },
  {
    name: 'The Economist',
    slug: 'the-economist',
    category: 'world',
    country: 'UK',
    comments: false
  },
  {
    name: 'The Economist Finance',
    slug: 'the-economist-finance',
    category: 'business',
    country: 'UK',
    comments: false
  },
  {
    name: 'NYT World',
    slug: 'nyt-world',
    category: 'world',
    country: 'US',
    comments: true,
    commentPlatform: 'nyt'
  },
  {
    name: 'NYT Business',
    slug: 'nyt-business',
    category: 'business',
    country: 'US',
    comments: true,
    commentPlatform: 'nyt'
  },
  {
    name: 'NYT Technology',
    slug: 'nyt-technology',
    category: 'tech',
    country: 'US',
    comments: true,
    commentPlatform: 'nyt'
  },
  {
    name: 'WSJ World',
    slug: 'wsj-world',
    category: 'world',
    country: 'US',
    comments: false
  },
  {
    name: 'WSJ Tech',
    slug: 'wsj-tech',
    category: 'tech',
    country: 'US',
    comments: false
  },
  {
    name: 'Washington Post World',
    slug: 'washington-post-world',
    category: 'world',
    country: 'US',
    comments: false
  },
  {
    name: 'Washington Post Business',
    slug: 'washington-post-business',
    category: 'business',
    country: 'US',
    comments: false
  },
  {
    name: 'BBC World News',
    slug: 'bbc-world-news',
    category: 'world',
    country: 'UK',
    comments: false
  },
  {
    name: 'BBC Business',
    slug: 'bbc-business',
    category: 'business',
    country: 'UK',
    comments: false
  },
  {
    name: 'MIT Technology Review',
    slug: 'mit-technology-review',
    category: 'tech',
    country: 'US',
    comments: false
  },
  {
    name: 'Ars Technica',
    slug: 'ars-technica',
    category: 'tech',
    country: 'US',
    comments: true,
    commentPlatform: 'ars'
  },
  {
    name: 'Bloomberg Technology',
    slug: 'bloomberg-technology',
    category: 'tech',
    country: 'US',
    comments: false
  }
];

const BY_SLUG = new Map(SOURCES.map((s) => [s.slug, s]));
const BY_NAME = new Map(SOURCES.map((s) => [s.name.toLowerCase(), s]));

export function slugifySourceName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getSourceBySlug(slug) {
  return BY_SLUG.get(String(slug || '').toLowerCase()) || null;
}

export function getSourceByName(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).toLowerCase())
    || BY_SLUG.get(slugifySourceName(name))
    || null;
}

export function sourcePath(slug) {
  return `/source/${slug}`;
}

export function parseAppPath(pathname = window.location.pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') {
    return { view: 'home' };
  }
  if (path === '/sources') {
    return { view: 'sources' };
  }
  const match = path.match(/^\/source\/([^/]+)$/);
  if (match) {
    return { view: 'source', slug: decodeURIComponent(match[1]) };
  }
  return { view: 'notfound', path };
}
