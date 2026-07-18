import { chatCompletion } from './llm.mjs';
import { preferencesPromptBlock, normalizePreferences } from './prefs.mjs';

function hoursAgo(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() - hours);
  return d;
}

/**
 * Load candidate articles for a "since last visit" briefing.
 */
export async function loadArticlesSince(db, {
  sinceAt,
  preferences,
  limit = 48
} = {}) {
  const prefs = normalizePreferences(preferences);
  const since = sinceAt ? new Date(sinceAt) : hoursAgo(new Date(), 36);
  const result = await db.query(
    `SELECT a.id, a.title, a.description, a.link, a.pub_date, a.topics,
            a.relevance_score, a.scraped_excerpt, a.scraped_body, a.content,
            a.scrape_status, f.name AS feed_name, f.category AS feed_category
     FROM articles a
     JOIN feeds f ON a.feed_id = f.id
     WHERE COALESCE(a.is_relevant, true) = true
       AND COALESCE(a.relevance_score, 0) >= 18
       AND COALESCE(a.pub_date, a.created_at) >= $1
       AND f.active = true
     ORDER BY COALESCE(a.relevance_score, 0) DESC, a.pub_date DESC NULLS LAST
     LIMIT $2`,
    [since, limit]
  );

  let rows = result.rows;
  if (prefs.mutedSources.length) {
    const muted = new Set(prefs.mutedSources.map((s) => s.toLowerCase()));
    rows = rows.filter((r) => !muted.has(String(r.feed_name).toLowerCase()));
  }
  if (prefs.preferredSources.length) {
    const preferred = new Set(prefs.preferredSources.map((s) => s.toLowerCase()));
    const boosted = rows.filter((r) => preferred.has(String(r.feed_name).toLowerCase()));
    const rest = rows.filter((r) => !preferred.has(String(r.feed_name).toLowerCase()));
    rows = [...boosted, ...rest];
  }
  if (prefs.disinterests.length) {
    const bad = prefs.disinterests.map((s) => s.toLowerCase());
    rows = rows.filter((r) => {
      const hay = `${r.title} ${r.description} ${(r.topics || []).join(' ')}`.toLowerCase();
      return !bad.some((b) => hay.includes(b));
    });
  }

  return { since, articles: rows.slice(0, limit) };
}

function articleContextBlock(articles) {
  return articles
    .map((a, i) => {
      const body = (a.scraped_excerpt || a.scraped_body || a.description || a.content || '')
        .toString()
        .replace(/\s+/g, ' ')
        .slice(0, 700);
      return [
        `[#${i + 1}] id=${a.id}`,
        `source=${a.feed_name} | ${a.feed_category || ''}`,
        `published=${a.pub_date ? new Date(a.pub_date).toISOString() : 'unknown'}`,
        `title=${a.title}`,
        `url=${a.link}`,
        `topics=${(a.topics || []).join(', ') || 'n/a'}`,
        `text=${body}`
      ].join('\n');
    })
    .join('\n\n');
}

export function buildDigestSystemPrompt({ preferences, systemPromptExtra = '' }) {
  return `You are Worldwire Presenter — a news briefing editor for a personal intelligence desk.

Mission:
- Cluster the supplied articles into distinct news EVENTS (not one bullet per headline).
- Emphasize what is NEW since the user's last visit.
- Prefer substance over clickbait. Note uncertainty and conflicting coverage.
- Respect the user's interests, muted sources, and viewpoint instructions.
- Never invent facts that are not supported by the article texts.
- Only use publicly available text provided below (RSS + scraped public pages).

User preferences:
${preferencesPromptBlock(preferences)}

${systemPromptExtra ? `Additional presenter directives:\n${systemPromptExtra}` : ''}

Output STRICT JSON with this shape:
{
  "headline": "short desk headline",
  "lede": "1-2 sentence overview of what changed",
  "events": [
    {
      "title": "event title",
      "summary": "2-4 sentences",
      "whyItMatters": "one sentence",
      "confidence": "high|medium|low",
      "articleIndexes": [1, 2],
      "topics": ["..."]
    }
  ],
  "watchlist": ["optional follow-ups or questions for the user"],
  "ignoredNote": "optional: what you de-emphasized and why"
}`;
}

export async function generateDigest({ articles, preferences, systemPromptExtra, since }) {
  if (!articles.length) {
    return {
      ok: true,
      model: null,
      digest: {
        headline: 'Quiet desk',
        lede: 'No strong new stories matched your filters since your last visit.',
        events: [],
        watchlist: ['Widen interests, unmute a source, or crawl feeds for fresher items.'],
        ignoredNote: null
      },
      fallback: false
    };
  }

  const system = buildDigestSystemPrompt({ preferences, systemPromptExtra });
  const userContent = [
    `Last visit watermark (UTC): ${since.toISOString()}`,
    `Article count: ${articles.length}`,
    '',
    articleContextBlock(articles)
  ].join('\n');

  const result = await chatCompletion({
    system,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.35,
    maxTokens: 2600,
    responseFormat: { type: 'json_object' }
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      missingKey: result.missingKey,
      digest: heuristicDigest(articles, since),
      fallback: true,
      model: result.model
    };
  }

  try {
    const parsed = JSON.parse(result.content);
    return {
      ok: true,
      digest: normalizeDigestJson(parsed, articles),
      model: result.model,
      fallback: false
    };
  } catch {
    return {
      ok: true,
      digest: heuristicDigest(articles, since),
      model: result.model,
      fallback: true,
      error: 'invalid_json_from_model'
    };
  }
}

function normalizeDigestJson(parsed, articles) {
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  return {
    headline: String(parsed.headline || 'Worldwire briefing').slice(0, 160),
    lede: String(parsed.lede || '').slice(0, 600),
    events: events.slice(0, 12).map((e) => {
      const indexes = Array.isArray(e.articleIndexes) ? e.articleIndexes : [];
      const refs = indexes
        .map((n) => articles[Number(n) - 1])
        .filter(Boolean)
        .map((a) => ({
          id: a.id,
          title: a.title,
          source: a.feed_name,
          url: a.link
        }));
      return {
        title: String(e.title || 'Untitled event').slice(0, 180),
        summary: String(e.summary || '').slice(0, 1600),
        whyItMatters: String(e.whyItMatters || '').slice(0, 400),
        confidence: ['high', 'medium', 'low'].includes(e.confidence) ? e.confidence : 'medium',
        topics: Array.isArray(e.topics) ? e.topics.map(String).slice(0, 8) : [],
        articles: refs
      };
    }),
    watchlist: Array.isArray(parsed.watchlist)
      ? parsed.watchlist.map(String).slice(0, 8)
      : [],
    ignoredNote: parsed.ignoredNote ? String(parsed.ignoredNote).slice(0, 500) : null
  };
}

function heuristicDigest(articles, since) {
  const top = articles.slice(0, 8);
  return {
    headline: 'Fresh wires (offline presenter)',
    lede: `Showing ${top.length} high-signal items since ${since.toISOString()} while the AI presenter is unavailable.`,
    events: top.map((a) => ({
      title: a.title,
      summary: (a.scraped_excerpt || a.description || '').slice(0, 420),
      whyItMatters: `From ${a.feed_name}`,
      confidence: 'medium',
      topics: a.topics || [],
      articles: [{ id: a.id, title: a.title, source: a.feed_name, url: a.link }]
    })),
    watchlist: ['Ask the presenter to emphasize or mute topics once AI is connected.'],
    ignoredNote: 'Heuristic fallback — Netlify AI Gateway may need enabling.'
  };
}

export function digestToMarkdown(digest) {
  const lines = [`# ${digest.headline}`, '', digest.lede || '', ''];
  for (const event of digest.events || []) {
    lines.push(`## ${event.title}`);
    lines.push(event.summary || '');
    if (event.whyItMatters) lines.push(`*Why it matters:* ${event.whyItMatters}`);
    if (event.articles?.length) {
      lines.push(
        event.articles.map((a) => `- [${a.source}](${a.url}) — ${a.title}`).join('\n')
      );
    }
    lines.push('');
  }
  if (digest.watchlist?.length) {
    lines.push('## Watchlist');
    for (const w of digest.watchlist) lines.push(`- ${w}`);
  }
  return lines.join('\n').trim();
}
