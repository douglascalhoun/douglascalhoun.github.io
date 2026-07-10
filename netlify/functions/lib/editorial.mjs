/**
 * Worldwire editorial filter
 *
 * Product thesis:
 * - Primary: high-impact technology progress (AI + VR/software first, then broader tech)
 * - Secondary: consequential geopolitics and business
 * - Aggressively demote: pop culture, celebrity, sports minutiae, incremental politics
 */

export const EDITORIAL_FEEDS = [
  // AI / frontier tech
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'ai', country: 'US', priority: 10 },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'ai', country: 'US', priority: 9 },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', category: 'ai', country: 'UK', priority: 9 },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'tech', country: 'US', priority: 9 },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'ai', country: 'US', priority: 8 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech', country: 'US', priority: 8 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', country: 'US', priority: 7 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech', country: 'US', priority: 7 },
  { name: 'Hacker News Front Page', url: 'https://hnrss.org/frontpage', category: 'tech', country: 'Global', priority: 7 },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', category: 'tech', country: 'US', priority: 8 },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'ai', country: 'US', priority: 7 },

  // VR / spatial / immersive software
  { name: 'UploadVR', url: 'https://uploadvr.com/feed/', category: 'vr', country: 'US', priority: 8 },
  { name: 'Road to VR', url: 'https://www.roadtovr.com/feed/', category: 'vr', country: 'US', priority: 8 },
  { name: 'Meta Quest Blog', url: 'https://www.meta.com/blog/quest/rss/', category: 'vr', country: 'US', priority: 6 },

  // Business / markets with tech gravity
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'business', country: 'US', priority: 6 },

  // Selective geopolitics / major world events (not play-by-play)
  { name: 'BBC World News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', country: 'UK', priority: 5 }
];

/** Hard rejects — almost never surface */
const HARD_EXCLUDE = [
  // pop culture / entertainment
  'celebrity', 'celebrities', 'hollywood', 'gossip', 'hollywood gossip',
  'box office', 'trailer', 'netflix special', 'reality tv', 'reality show',
  'grammy', 'oscar', 'emmy', 'met gala', 'red carpet',
  'kardashian', 'taylor swift', 'beyonce', 'rihanna',
  'hollywood dating', 'divorces', 'engagement ring',
  // sports minutiae
  'box score', 'fantasy football', 'injury report', 'transfer rumor',
  'nba draft pick', 'nfl week', 'premier league table',
  // lifestyle fluff
  'horoscope', 'zodiac', 'best sneakers', 'outfit of the day',
  'recipe of the day', 'what to wear', 'dating tips'
];

/** Soft demotions for incremental politics / statement cycles */
const INCREMENTAL_POLITICS = [
  'says ', ' said', 'urges', 'warns that', 'responds to', 'reacts to',
  'slams ', 'blasts ', 'fires back', 'doubles down',
  'live updates', 'live blog', 'as it happened', 'minute by minute',
  'what we know so far', 'what to know', 'key takeaways from',
  'press conference', 'press briefing', 'remarks at',
  'tweeted', 'posts on x', 'truth social',
  'poll shows', 'approval rating', 'fundraising haul',
  'campaign stop', 'rally in', 'town hall',
  'diplomatic spat', 'war of words', 'tit-for-tat',
  'sources say', 'anonymous officials',
  'expected to announce', 'may announce', 'could announce'
];

/** High-signal tech / AI / VR boosters */
const TECH_BOOST = [
  // AI core
  'artificial intelligence', ' ai ', 'llm', 'large language model',
  'gpt-', 'openai', 'anthropic', 'claude', 'gemini', 'deepmind',
  'foundation model', 'multimodal', 'agentic', 'ai agent',
  'machine learning', 'neural net', 'transformer', 'diffusion model',
  'inference', 'training run', 'compute cluster', 'gpu cluster',
  'open weights', 'open-source model', 'model release',
  // VR / spatial / immersive
  'virtual reality', 'augmented reality', 'mixed reality', ' xr ',
  'meta quest', 'apple vision', 'vision pro', 'spatial computing',
  'headset', 'immersive', 'unity engine', 'unreal engine',
  // broader high-impact tech
  'semiconductor', 'chip design', 'tsmc', 'nvidia', 'asml',
  'quantum computing', 'fusion energy', 'robotics', 'autonomous',
  'cybersecurity breach', 'zero-day', 'encryption',
  'satellite internet', 'spacex', 'rocket launch',
  'biotech', 'gene editing', 'crispr',
  'battery breakthrough', 'solid-state battery',
  'open source', 'developer platform', 'api launch'
];

/** Consequential world/business events (keep these even if not tech) */
const MAJOR_EVENT_BOOST = [
  'declares war', 'invasion of', 'coup ', 'military strike',
  'ceasefire collapses', 'nuclear', 'sanctions package',
  'central bank', 'interest rate decision', 'recession',
  'ipo ', 'acquisition of', 'acquires ', 'merger',
  'antitrust', 'breaks up', 'market crash', 'bank failure',
  'pandemic', 'outbreak declared', 'treaty signed',
  'election results', 'wins presidency', 'impeached',
  'supreme court rules', 'landmark ruling'
];

/** Patterns that often indicate first-order conflict/event coverage worth keeping */
const FIRST_ORDER_WORLD = [
  'launches strikes', 'begins offensive', 'invades ', 'attacks ',
  'declares emergency', 'imposes sanctions', 'seizes ',
  'assassinat', 'hostage', 'missile strike', 'naval blockade'
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
 * Score an article for Worldwire relevance.
 * Returns { score, keep, reasons, topics }
 * keep=false means hide from default feed and never notify.
 */
export function scoreArticle(article, feed = {}) {
  const text = ` ${normalizeText(article)} `;
  const category = (feed.category || article.feed_category || '').toLowerCase();
  const reasons = [];
  let score = 0;

  // Category priors
  if (category === 'ai') score += 25;
  else if (category === 'vr') score += 22;
  else if (category === 'tech') score += 15;
  else if (category === 'business') score += 8;
  else if (category === 'world') score += 2;

  if (typeof feed.priority === 'number') {
    score += Math.min(feed.priority, 10);
  }

  const hardHits = includesAny(text, HARD_EXCLUDE);
  if (hardHits.length) {
    return {
      score: -100,
      keep: false,
      reasons: [`hard_exclude:${hardHits.slice(0, 3).join(',')}`],
      topics: []
    };
  }

  const techHits = includesAny(text, TECH_BOOST);
  if (techHits.length) {
    score += Math.min(40, techHits.length * 8);
    reasons.push(`tech:${techHits.slice(0, 4).join(',')}`);
  }

  const majorHits = includesAny(text, MAJOR_EVENT_BOOST);
  if (majorHits.length) {
    score += Math.min(25, majorHits.length * 10);
    reasons.push(`major:${majorHits.slice(0, 3).join(',')}`);
  }

  const firstOrderHits = includesAny(text, FIRST_ORDER_WORLD);
  if (firstOrderHits.length) {
    score += 18;
    reasons.push(`first_order:${firstOrderHits.slice(0, 2).join(',')}`);
  }

  const incrementalHits = includesAny(text, INCREMENTAL_POLITICS);
  if (incrementalHits.length) {
    // Stronger penalty for world/news feeds; milder for tech
    const penalty = ['world', 'news'].includes(category) ? 18 : 8;
    score -= Math.min(45, incrementalHits.length * penalty);
    reasons.push(`incremental:${incrementalHits.slice(0, 3).join(',')}`);
  }

  // World/business without tech or major-event signal: demote hard
  if (['world', 'news'].includes(category) && techHits.length === 0 && majorHits.length === 0 && firstOrderHits.length === 0) {
    score -= 20;
    reasons.push('world_without_signal');
  }

  // Business fluff without tech gravity
  if (category === 'business' && techHits.length === 0 && majorHits.length === 0) {
    score -= 10;
    reasons.push('business_without_signal');
  }

  // Title length / listicle heuristics
  const title = (article.title || '').toLowerCase();
  if (/^\d+\s+(ways|things|tips|best)/.test(title) || title.includes('you won\'t believe')) {
    score -= 25;
    reasons.push('listicle');
  }

  const topics = [];
  if (techHits.some((h) => /ai|llm|gpt|openai|anthropic|claude|gemini|deepmind|machine learning|neural|agent/.test(h))) {
    topics.push('ai');
  }
  if (techHits.some((h) => /virtual reality|augmented reality|mixed reality| xr |quest|vision pro|spatial|immersive|headset/.test(h))) {
    topics.push('vr');
  }
  if (techHits.length && !topics.includes('ai') && !topics.includes('vr')) topics.push('tech');
  if (majorHits.length || firstOrderHits.length) topics.push('geopolitics');
  if (category === 'business' || /ipo|acquisition|merger|antitrust|market/.test(text)) topics.push('business');

  // Thresholds:
  // keep for feed: score >= 12
  // notify-worthy: score >= 28 (checked by caller)
  const keep = score >= 12;

  return { score, keep, reasons, topics };
}

export function isNotifyWorthy(scoreResult) {
  return scoreResult.keep && scoreResult.score >= 28;
}

/** Default excluded keywords for new subscriptions */
export const DEFAULT_EXCLUDED_KEYWORDS = [
  'celebrity', 'gossip', 'box office', 'reality tv',
  'live updates', 'as it happened', 'what we know so far',
  'poll shows', 'fundraising', 'fantasy football'
];

export const DEFAULT_INCLUDE_KEYWORDS = [];
