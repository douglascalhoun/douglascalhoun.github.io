/**
 * Build a one-line "wire brief" from the unread pile.
 */

const THEMES = [
  { key: 'AI', re: /\b(a\.?i\.?|openai|anthropic|claude|gemini|chatgpt|llm|machine learning)\b/i },
  { key: 'chips', re: /\b(chip|semiconductor|nvidia|tsmc|asml|gpu|foundry|intel|sk hynix)\b/i },
  { key: 'tariffs', re: /\b(tariff|trade war|sanctions|customs)\b/i },
  { key: 'markets', re: /\b(bond|stock|ipo|federal reserve|interest rate|inflation|recession)\b/i },
  { key: 'security', re: /\b(ransomware|cyber|breach|hack|espionage)\b/i },
  { key: 'war', re: /\b(war|missile|airstrike|invasion|ceasefire|nato)\b/i },
  { key: 'energy', re: /\b(oil|opec|nuclear|battery|fusion|climate)\b/i },
  { key: 'space', re: /\b(spacex|rocket|satellite|orbit|nasa)\b/i },
];

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Night wire";
  if (hour < 12) return "Morning wire";
  if (hour < 17) return "Afternoon wire";
  if (hour < 21) return "Evening wire";
  return "Night wire";
}

export function buildWireBrief(stories = []) {
  if (!stories.length) {
    return {
      headline: `${greeting()} is clear`,
      detail: 'You’re caught up. Fresh items usually land within the next half hour.',
    };
  }

  const counts = new Map();
  for (const story of stories) {
    const text = `${story.title || ''} ${story.description || ''}`;
    for (const theme of THEMES) {
      if (theme.re.test(text)) {
        counts.set(theme.key, (counts.get(theme.key) || 0) + 1);
      }
    }
  }

  const topThemes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);

  const desks = new Set(stories.map((s) => s.feed_name).filter(Boolean)).size;
  const themeBit = topThemes.length
    ? topThemes.join(', ').replace(/, ([^,]+)$/, ' & $1')
    : 'mixed desks';

  return {
    headline: `${greeting()}: ${themeBit}`,
    detail: `${stories.length} unread from ${desks} ${desks === 1 ? 'desk' : 'desks'}`,
  };
}
