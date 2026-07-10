/**
 * Worldwire editorial filter
 *
 * Harvest from respected newsrooms, then keep only consequential stories:
 * - technology progress and major tech-business
 * - systemic geopolitics / markets / institutions
 *
 * Drop celebrity noise, incremental politics, gadget fluff, and low-signal
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

/** Always drop — celebrity, sports, lifestyle, consumer gadget fluff */
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
  'world cup squad', 'champions league', 'video game', 'expansion pack',
  // lifestyle / consumer fluff
  'horoscope', 'zodiac', 'best sneakers', 'outfit of the day',
  'recipe of the day', 'what to wear', 'dating tips',
  'should you be switching', 'should you switch',
  'which macbook', 'which iphone', 'which laptop', 'my honest advice',
  'tips for', 'how to save money on', 'how i switched', 'i switched banks',
  'way cheaper', 'buying guide', 'should you buy', 'worth buying',
  'deal alert', 'price drop', 'on sale', 'coupon',
  'hands-on with', 'unboxing', 'first look at',
  // meta / filler journalism
  'ask me anything', "i'm filling in", 'i’m filling in',
  'our favorite', 'week in photos', 'quiz:',
  'morning briefing', 'evening briefing', 'week ahead',
  'what we\'re reading', 'from our inbox', 'letters to the editor',
  // local crime / tragedy incident patterns
  'rape and murder', 'stabbed to death', 'shot dead in',
  'missing child', 'body found', 'arrested for',
  'murder trial', 'sentenced to', 'pleads guilty',
  // soft local/incident framing
  'engulf', 'sweeps southern', 'sweeps northern',
  ' enthralls', 'goes viral',
];

/** Statement-cycle / incremental politics (title-weighted) */
const INCREMENTAL_POLITICS = [
  'reacts to', 'responds to', 'fires back', 'doubles down',
  'slams ', 'blasts ', 'rips ', 'claps back',
  'live updates', 'live blog', 'as it happened', 'minute by minute',
  'what we know so far', 'what to know right now', 'key takeaways from',
  'press conference', 'press briefing', 'remarks at',
  'tweeted', 'posts on x', 'truth social',
  'poll shows', 'approval rating', 'fundraising haul',
  'campaign stop', 'town hall',
  'diplomatic spat', 'war of words', 'tit-for-tat',
  'sources say', 'anonymous officials',
  'expected to announce', 'may announce', 'could announce',
  'latest on the', 'overnight briefing', 'morning briefing',
  'appears to pause', 'roundup:', 'in brief',
  '5 things', 'things to know', 'what to know',
];

/** Low-signal incident / random-event / place-filler patterns */
const LOW_SIGNAL_INCIDENT = [
  'killed as', 'killed in', 'dead after', 'dies after',
  'injured in', 'wounded in', 'crash kills', 'collision',
  'car crash', 'fatal crash', 'plane crash', 'train derail',
  'wildfire', 'wildfires', 'brush fire', 'house fire',
  'flooding in', 'floods hit', 'earthquake', 'storm lashes',
  'heatwave', 'tornado', 'hurricane', 'mudslide',
  'protests erupt', 'protests engulf', 'protest in', 'protesters',
  'demonstration in', 'clashes break out', 'clash with police',
  'building collapse', 'factory fire', 'bus crash',
  'shooting in', 'stabbing in', 'explosion in',
  'tourist', 'tourism leader', 'hotel strike',
  'whale', 'whales facing', 'animal rescue',
  'local officials', 'county ', 'suburb of', 'village of ', 'town of ',
  'power outage', 'water main', 'gas leak', 'evacuated',
  'missing person', 'search for', 'rescued from',
  'rally in', 'march in', 'riot in',
];

/** Labor / workplace fluff without systemic stakes */
const LABOR_FLUFF = [
  'union vote', 'union workers', 'workers strike', 'labor dispute',
  'wage talks', 'collective bargaining', 'walkout at',
  'employees protest', 'staff walk out',
];

/** Must-have importance signals for world/business stories */
const IMPORTANCE_SIGNALS = [
  // tech / AI / platforms (specific — avoid bare "model"/"chip"/"software")
  'artificial intelligence', ' ai ', ' a.i', 'llm', 'language model',
  'foundation model', 'openai', 'anthropic', 'claude',
  'gemini', 'deepmind', 'chatgpt', 'machine learning',
  'semiconductor', 'chipmaker', 'chip giant', 'chip design',
  'nvidia', 'tsmc', 'asml', 'cybersecurity', 'ransomware',
  'data breach', 'quantum computing', 'robotics', 'humanoid robot',
  'autonomous vehicle', 'self-driving', 'data center',
  // markets / institutions
  'federal reserve', 'central bank', 'interest rate', 'inflation',
  'recession', 'gdp ', 'us treasury', 'treasury yield', 'treasury bond',
  'bond market', 'stock market', 'oil prices', 'opec', 'trade war',
  'tariff', 'sanctions', 'antitrust', 'merger', 'acquisition', 'acquires',
  'bankruptcy', 'bailout', 'sovereign default', 'debt ceiling',
  'shareholder revolt', 'hostile takeover',
  // major geopolitics
  'nato', 'united nations', 'security council', 'nuclear weapon',
  'nuclear war', 'invasion', 'declares war', 'ceasefire',
  'missile', 'airstrike', 'military strike', 'coup ',
  'election results', 'wins presidency', 'presidential election',
  'supreme court', 'congress passes', 'parliament passes',
  'impeach', 'constitution', 'treaty', 'alliance',
  'genocide', 'famine', 'pandemic', 'martial law',
  'state of emergency', 'humanitarian crisis', 'refugee crisis',
  'arms deal', 'defense spending', 'espionage', 'cyber warfare',
  // major actors
  'white house', 'kremlin', 'beijing', 'brussels', 'downing street',
  'european union', 'world bank', 'imf ', 'wto ',
];

/** Extra tech keepers / boosters — specific phrases only */
const TECH_SIGNAL = [
  'artificial intelligence', ' ai ', ' a.i', 'llm',
  'language model', 'foundation model', 'ai model',
  'openai', 'anthropic', 'claude', 'gemini', 'chatgpt', 'deepmind',
  'machine learning', 'neural net', 'semiconductor', 'chipmaker',
  'chip design', 'gpu', 'nvidia', 'tsmc', 'asml', 'data center',
  'cybersecurity', 'ransomware', 'data breach', 'encryption',
  'open source', 'vision pro', 'spatial computing',
  'augmented reality', 'virtual reality', 'mixed reality',
  'humanoid robot', 'robotics', 'autonomous vehicle', 'self-driving',
  'ev battery', 'fusion energy', 'quantum computing', 'quantum chip',
  'spacex', 'starlink', 'biotech', 'crispr', 'gene editing',
];

/** Strong keepers that alone can justify retention */
const STRONG_TECH = [
  'artificial intelligence', ' ai ', 'llm', 'openai', 'anthropic',
  'claude', 'gemini', 'chatgpt', 'deepmind', 'machine learning',
  'nvidia', 'tsmc', 'asml', 'semiconductor', 'chipmaker',
  'quantum computing', 'ransomware', 'data breach', 'cybersecurity',
  'vision pro', 'spatial computing', 'augmented reality', 'virtual reality',
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
  const titlePad = ` ${title} `;
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

  // Incremental politics: hard-drop when title is statement-cycle fluff
  // without a strong systemic signal in the title itself.
  const incrementalHits = includesAny(titlePad, INCREMENTAL_POLITICS);
  const titleImportance = includesAny(titlePad, IMPORTANCE_SIGNALS);
  const titleTech = includesAny(titlePad, STRONG_TECH);
  if (incrementalHits.length && titleImportance.length === 0 && titleTech.length === 0) {
    return reject(-50, `incremental:${incrementalHits.slice(0, 3).join(',')}`);
  }

  // Gadget / product-review filler
  if (
    /^\d+\s+(ways|things|tips|best)/.test(title) ||
    title.includes("you won't believe") ||
    title.includes('ask me anything') ||
    /\b(review|hands-on|unboxing|vs\.|versus)\b/.test(title) ||
    /\b(cheaper|deal|coupon|on sale)\b/.test(title)
  ) {
    if (!includesAny(text, STRONG_TECH).length) {
      return reject(-40, 'filler_format');
    }
  }

  // Consumer AR/VR glasses / accessory reviews without platform stakes
  if (
    /\b(glasses|earbuds|headphones|smartwatch|phone case|charger)\b/.test(text) &&
    /\b(cheaper|review|hands-on|vs\.|versus|buy|price)\b/.test(text) &&
    !includesAny(text, ['openai', 'anthropic', 'nvidia', 'apple vision', 'vision pro', 'chatgpt']).length
  ) {
    return reject(-42, 'gadget_accessory');
  }

  const laborHits = includesAny(text, LABOR_FLUFF);
  const incidentHits = includesAny(text, LOW_SIGNAL_INCIDENT);
  const importanceHits = includesAny(text, IMPORTANCE_SIGNALS);
  const techHits = includesAny(text, TECH_SIGNAL);
  const strongTechHits = includesAny(text, STRONG_TECH);

  // Labor fluff without tech/policy stakes → drop
  if (laborHits.length && strongTechHits.length === 0 && importanceHits.length === 0) {
    return reject(-38, `labor_fluff:${laborHits.slice(0, 2).join(',')}`);
  }

  // Random incident coverage without systemic importance → drop
  if (incidentHits.length && importanceHits.length === 0 && techHits.length === 0) {
    return reject(-45, `low_signal_incident:${incidentHits.slice(0, 2).join(',')}`);
  }

  // World/business must clear an importance bar
  if (category === 'world' || category === 'business') {
    if (importanceHits.length === 0 && techHits.length === 0) {
      return reject(-35, 'no_importance_signal');
    }
    // Single weak importance hit on a world incident story is not enough
    if (
      incidentHits.length &&
      strongTechHits.length === 0 &&
      importanceHits.length < 2 &&
      !includesAny(text, [
        'sanctions', 'invasion', 'ceasefire', 'nuclear', 'nato',
        'federal reserve', 'trade war', 'tariff', 'coup ',
      ]).length
    ) {
      return reject(-36, 'incident_without_systemic_stakes');
    }
  }

  // Tech: still drop soft/non-news unless it has a real tech signal
  if (category === 'tech' && techHits.length === 0 && importanceHits.length === 0) {
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
    score -= 10;
    reasons.push('has_incident_context');
  }
  if (laborHits.length) {
    score -= 6;
    reasons.push('has_labor_context');
  }

  const topics = [];
  if (techHits.some((h) => /ai|llm|openai|anthropic|claude|gemini|machine learning|chatgpt|deepmind/.test(h))) {
    topics.push('ai');
  }
  if (techHits.some((h) => /virtual reality|augmented reality|vision pro|spatial/.test(h))) {
    topics.push('vr');
  }
  if (category === 'tech' || techHits.length) topics.push('tech');
  if (category === 'business' || /market|bank|economy|trade|inflation/.test(text)) topics.push('business');
  if (category === 'world' || /sanctions|nato|nuclear|invasion|election/.test(text)) topics.push('world');

  // Final threshold: require score floor + real signal
  // Prefer strong tech or multi-importance for borderline keeps
  const hasSignal = techHits.length > 0 || importanceHits.length > 0;
  const keep = score >= 20 && hasSignal && (
    strongTechHits.length > 0 ||
    importanceHits.length >= 1 && !incidentHits.length ||
    importanceHits.length >= 2 ||
    (category === 'tech' && techHits.length > 0)
  );

  if (!keep) {
    return reject(score, 'below_importance_threshold');
  }

  reasons.push('kept');
  return { score, keep: true, reasons, topics };
}

export function isNotifyWorthy(scoreResult) {
  return scoreResult.keep && scoreResult.score >= 28;
}
