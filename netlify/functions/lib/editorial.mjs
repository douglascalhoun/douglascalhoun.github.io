/**
 * Worldwire editorial filter
 *
 * Harvest broadly from respected newsrooms, then strip:
 * - celebrity / pop culture
 * - incremental politics and ongoing-event minutiae
 *
 * Remaining stories are kept for the unread feed.
 */

export const EDITORIAL_FEEDS = [
  // Global / intellectual general interest
  { name: 'Financial Times', url: 'https://www.ft.com/?format=rss', category: 'world', country: 'UK', priority: 9 },
  { name: 'The Economist', url: 'https://www.economist.com/the-world-this-week/rss.xml', category: 'world', country: 'UK', priority: 9 },
  { name: 'The Economist Finance', url: 'https://www.economist.com/finance-and-economics/rss.xml', category: 'business', country: 'UK', priority: 8 },
  { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'world', country: 'US', priority: 8 },
  { name: 'NYT Business', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'business', country: 'US', priority: 7 },
  { name: 'NYT Technology', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'tech', country: 'US', priority: 8 },
  { name: 'WSJ World', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'world', country: 'US', priority: 8 },
  { name: 'WSJ Tech', url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml', category: 'tech', country: 'US', priority: 7 },
  { name: 'Washington Post World', url: 'https://feeds.washingtonpost.com/rss/world', category: 'world', country: 'US', priority: 7 },
  { name: 'Washington Post Business', url: 'https://feeds.washingtonpost.com/rss/business', category: 'business', country: 'US', priority: 6 },
  { name: 'BBC World News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', country: 'UK', priority: 7 },
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'business', country: 'UK', priority: 6 },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', category: 'world', country: 'UK', priority: 6 },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'world', country: 'US', priority: 6 },

  // Respected tech-focused newsrooms (not company blogs)
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'tech', country: 'US', priority: 9 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech', country: 'US', priority: 8 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech', country: 'US', priority: 8 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', country: 'US', priority: 7 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', country: 'US', priority: 7 },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', category: 'tech', country: 'US', priority: 8 },
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'tech', country: 'US', priority: 7 }
];

/** Sources that should never be active (company blogs / non-news) */
export const RETIRE_NAME_PATTERNS = [
  'OpenAI Blog',
  'Google AI Blog',
  'DeepMind Blog',
  'Meta Quest Blog',
  'UploadVR',
  'Road to VR',
  'Hacker News',
  'VentureBeat',
  'The Verge AI',
  'CNN',
  'Al Jazeera',
  'Der Spiegel',
  'El País',
  'South China Morning Post',
  'The Japan Times'
];

const HARD_EXCLUDE = [
  'celebrity', 'celebrities', 'hollywood', 'gossip', 'hollywood gossip',
  'box office', 'trailer', 'reality tv', 'reality show',
  'grammy', 'oscar', 'emmy', 'met gala', 'red carpet',
  'kardashian', 'taylor swift', 'beyonce', 'rihanna',
  'hollywood dating', 'divorces', 'engagement ring',
  'box score', 'fantasy football', 'injury report', 'transfer rumor',
  'nba draft', 'nfl week', 'premier league table',
  'horoscope', 'zodiac', 'best sneakers', 'outfit of the day',
  'recipe of the day', 'what to wear', 'dating tips',
  'royal family', 'prince harry', 'meghan markle'
];

const INCREMENTAL_POLITICS = [
  'says ', ' said', 'urges', 'warns that', 'responds to', 'reacts to',
  'slams ', 'blasts ', 'fires back', 'doubles down',
  'live updates', 'live blog', 'as it happened', 'minute by minute',
  'what we know so far', 'what to know right now', 'key takeaways from',
  'press conference', 'press briefing', 'remarks at',
  'tweeted', 'posts on x', 'truth social',
  'poll shows', 'approval rating', 'fundraising haul',
  'campaign stop', 'rally in', 'town hall',
  'diplomatic spat', 'war of words', 'tit-for-tat',
  'sources say', 'anonymous officials',
  'expected to announce', 'may announce', 'could announce',
  'latest on the', 'overnight briefing', 'morning briefing'
];

function normalizeText(article) {
  const cats = Array.isArray(article.categories)
    ? article.categories.map((c) => (typeof c === 'string' ? c : c?._ || '')).join(' ')
    : '';
  return `${article.title || ''} ${article.description || ''} ${cats}`.toLowerCase();
}

function includesAny(text, phrases) {
  return phrases.filter((p) => text.includes(p.toLowerCase()));
}

/**
 * Keep almost all serious news; reject gossip and incremental noise.
 */
export function scoreArticle(article, feed = {}) {
  const text = ` ${normalizeText(article)} `;
  const category = (feed.category || article.feed_category || '').toLowerCase();
  const reasons = [];
  let score = 10 + Math.min(feed.priority || 5, 10);

  if (category === 'tech') score += 8;
  else if (category === 'business') score += 4;
  else if (category === 'world') score += 3;

  const hardHits = includesAny(text, HARD_EXCLUDE);
  if (hardHits.length) {
    return {
      score: -100,
      keep: false,
      reasons: [`hard_exclude:${hardHits.slice(0, 3).join(',')}`],
      topics: []
    };
  }

  const incrementalHits = includesAny(text, INCREMENTAL_POLITICS);
  if (incrementalHits.length) {
    return {
      score: -50,
      keep: false,
      reasons: [`incremental:${incrementalHits.slice(0, 3).join(',')}`],
      topics: []
    };
  }

  const title = (article.title || '').toLowerCase();
  if (/^\d+\s+(ways|things|tips|best)/.test(title) || title.includes("you won't believe")) {
    return {
      score: -40,
      keep: false,
      reasons: ['listicle'],
      topics: []
    };
  }

  const topics = [];
  if (/artificial intelligence|\bai\b|llm|openai|anthropic|claude|gemini|machine learning/.test(text)) {
    topics.push('ai');
    score += 10;
  }
  if (/virtual reality|augmented reality|mixed reality|vision pro|spatial computing/.test(text)) {
    topics.push('vr');
    score += 8;
  }
  if (category === 'tech' || /semiconductor|chip|cyber|software|startup/.test(text)) topics.push('tech');
  if (category === 'business' || /market|bank|economy|trade|inflation/.test(text)) topics.push('business');
  if (category === 'world') topics.push('world');

  reasons.push('kept');
  return { score, keep: true, reasons, topics };
}

export function isNotifyWorthy(scoreResult) {
  return scoreResult.keep && scoreResult.score >= 28;
}
