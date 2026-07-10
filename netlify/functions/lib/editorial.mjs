/**
 * Worldwire editorial filter
 *
 * Harvest from respected newsrooms, then keep only consequential stories:
 * - technology progress and major tech-business
 * - systemic geopolitics / markets / institutions
 *
 * Drop celebrity noise, incremental politics, and low-signal
 * "something happened somewhere" incident coverage.
 */

export const EDITORIAL_FEEDS = [
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
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'tech', country: 'US', priority: 9 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech', country: 'US', priority: 8 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech', country: 'US', priority: 8 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', country: 'US', priority: 7 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', country: 'US', priority: 7 },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', category: 'tech', country: 'US', priority: 8 },
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'tech', country: 'US', priority: 7 }
];

export const RETIRE_NAME_PATTERNS = [
  'OpenAI Blog', 'Google AI Blog', 'DeepMind Blog', 'Meta Quest Blog',
  'UploadVR', 'Road to VR', 'Hacker News', 'VentureBeat', 'The Verge AI',
  'CNN', 'Al Jazeera', 'Der Spiegel', 'El País',
  'South China Morning Post', 'The Japan Times'
];

/** Always drop */
const HARD_EXCLUDE = [
  // celebrity / entertainment
  'celebrity', 'celebrities', 'hollywood', 'gossip',
  'box office', 'trailer', 'reality tv', 'reality show',
  'grammy', 'oscar', 'emmy', 'met gala', 'red carpet',
  'kardashian', 'taylor swift', 'beyonce', 'rihanna',
  'royal family', 'prince harry', 'meghan markle',
  // sports minutiae
  'box score', 'fantasy football', 'injury report', 'transfer rumor',
  'nba draft', 'nfl week', 'premier league', 'fifa', 'red card',
  'world cup squad', 'champions league',
  // lifestyle / consumer fluff
  'horoscope', 'zodiac', 'best sneakers', 'outfit of the day',
  'recipe of the day', 'what to wear', 'dating tips',
  'should you be switching', 'should you switch',
  'tips for', 'how to save money on',
  // meta / filler journalism
  'ask me anything', 'i’m filling in', "i'm filling in",
  'our favorite', 'week in photos', 'quiz:',
  // local crime / tragedy incident patterns
  'rape and murder', 'stabbed to death', 'shot dead in',
  'missing child', 'body found', 'arrested for',
  'murder trial', 'sentenced to', 'pleads guilty',
  // soft local/incident framing
  'engulf', 'sweeps southern', 'sweeps northern',
  ' enthralls', 'goes viral'
];

/** Incremental politics / statement cycles */
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

/** Low-signal incident / random-event patterns */
const LOW_SIGNAL_INCIDENT = [
  'killed as', 'killed in', 'dead after', 'dies after',
  'injured in', 'wounded in', 'crash kills', 'collision',
  'wildfire', 'wildfires', 'flooding in', 'floods hit',
  'earthquake hits', 'storm lashes', 'heatwave',
  'protests erupt', 'protests engulf', 'clashes break out',
  'building collapse', 'factory fire', 'bus crash',
  'tourist', 'tourism leader', 'hotel strike',
  'whale', 'whales facing', 'animal rescue',
  'local officials', 'county', 'suburb of'
];

/** Must-have importance signals for world/business stories */
const IMPORTANCE_SIGNALS = [
  // tech / AI / platforms
  'artificial intelligence', ' ai ', 'llm', 'openai', 'anthropic', 'claude',
  'gemini', 'deepmind', 'machine learning', 'semiconductor', 'chipmaker',
  'chip giant', 'nvidia', 'tsmc', 'asml', 'cybersecurity', 'ransomware',
  'quantum', 'robotics', 'autonomous', 'software', 'startup', 'ipo',
  // markets / institutions
  'federal reserve', 'central bank', 'interest rate', 'inflation',
  'recession', 'gdp', 'treasury', 'bond market', 'stock market',
  'oil prices', 'opec', 'trade war', 'tariff', 'sanctions',
  'antitrust', 'merger', 'acquisition', 'acquires', 'billion',
  // major geopolitics
  'nato', 'united nations', 'security council', 'nuclear',
  'invasion', 'declares war', 'ceasefire', 'missile', 'airstrike',
  'military strike', 'coup', 'election results', 'wins presidency',
  'supreme court', 'congress passes', 'parliament passes',
  'impeach', 'constitution', 'treaty', 'alliance',
  // major actors
  'white house', 'kremlin', 'beijing', 'brussels', 'downing street',
  'european union', 'world bank', 'imf ', 'wto '
];

/** Extra tech keepers / boosters */
const TECH_SIGNAL = [
  'artificial intelligence', ' ai ', 'llm', 'model', 'openai', 'anthropic',
  'claude', 'gemini', 'chip', 'semiconductor', 'gpu', 'data center',
  'cyber', 'encryption', 'open source', 'api ', 'developer',
  'vision pro', 'spatial', 'augmented reality', 'virtual reality',
  'robot', 'autonomous', 'battery', 'fusion', 'quantum'
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

function reject(score, reason) {
  return { score, keep: false, reasons: [reason], topics: [] };
}

/**
 * Keep consequential stories only.
 */
export function scoreArticle(article, feed = {}) {
  const text = ` ${normalizeText(article)} `;
  const title = (article.title || '').toLowerCase();
  const category = (feed.category || article.feed_category || '').toLowerCase();
  const reasons = [];
  let score = 8 + Math.min(feed.priority || 5, 10);

  if (category === 'tech') score += 6;
  else if (category === 'business') score += 2;
  else if (category === 'world') score += 1;

  const hardHits = includesAny(text, HARD_EXCLUDE);
  if (hardHits.length) {
    return reject(-100, `hard_exclude:${hardHits.slice(0, 3).join(',')}`);
  }

  const incrementalHits = includesAny(text, INCREMENTAL_POLITICS);
  if (incrementalHits.length) {
    return reject(-50, `incremental:${incrementalHits.slice(0, 3).join(',')}`);
  }

  if (
    /^\d+\s+(ways|things|tips|best)/.test(title) ||
    title.includes("you won't believe") ||
    title.includes('ask me anything') ||
    /\b(review|hands-on|unboxing)\b/.test(title)
  ) {
    // Allow major platform reviews only if strong tech signal later; default reject gadget filler
    if (!includesAny(text, ['openai', 'anthropic', 'nvidia', 'apple vision', 'vision pro', 'chatgpt']).length) {
      return reject(-40, 'filler_format');
    }
  }

  const incidentHits = includesAny(text, LOW_SIGNAL_INCIDENT);
  const importanceHits = includesAny(text, IMPORTANCE_SIGNALS);
  const techHits = includesAny(text, TECH_SIGNAL);

  // Random incident coverage without systemic importance → drop
  if (incidentHits.length && importanceHits.length === 0 && techHits.length === 0) {
    return reject(-45, `low_signal_incident:${incidentHits.slice(0, 2).join(',')}`);
  }

  // World/business must clear an importance bar
  if (category === 'world' || category === 'business') {
    if (importanceHits.length === 0 && techHits.length === 0) {
      return reject(-35, 'no_importance_signal');
    }
  }

  // Tech: still drop soft/non-news unless it has a real tech signal
  if (category === 'tech' && techHits.length === 0 && importanceHits.length === 0) {
    // Allow serious security/business-tech phrasing already covered; otherwise drop vague posts
    if (!/\b(security|privacy|antitrust|regulation|outage|breach|lawsuit)\b/.test(text)) {
      return reject(-30, 'tech_without_signal');
    }
  }

  if (techHits.length) {
    score += Math.min(24, techHits.length * 6);
    reasons.push(`tech:${techHits.slice(0, 3).join(',')}`);
  }
  if (importanceHits.length) {
    score += Math.min(18, importanceHits.length * 5);
    reasons.push(`importance:${importanceHits.slice(0, 3).join(',')}`);
  }
  if (incidentHits.length) {
    score -= 8;
    reasons.push('has_incident_context');
  }

  const topics = [];
  if (techHits.some((h) => /ai|llm|openai|anthropic|claude|gemini|machine learning/.test(h))) topics.push('ai');
  if (techHits.some((h) => /virtual reality|augmented reality|vision pro|spatial/.test(h))) topics.push('vr');
  if (category === 'tech' || techHits.length) topics.push('tech');
  if (category === 'business' || /market|bank|economy|trade|inflation|billion/.test(text)) topics.push('business');
  if (category === 'world' || /sanctions|nato|nuclear|invasion|election/.test(text)) topics.push('world');

  // Final threshold: require a meaningful score floor
  const keep = score >= 18 && (techHits.length > 0 || importanceHits.length > 0);
  if (!keep) {
    return reject(score, 'below_importance_threshold');
  }

  reasons.push('kept');
  return { score, keep: true, reasons, topics };
}

export function isNotifyWorthy(scoreResult) {
  return scoreResult.keep && scoreResult.score >= 28;
}
