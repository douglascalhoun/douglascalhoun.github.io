import { chatCompletion, extractPreferencePatch } from './llm.mjs';
import {
  mergePreferencePatch,
  preferencesPromptBlock,
  normalizePreferences
} from './prefs.mjs';

export function buildChatSystemPrompt({
  preferences,
  systemPromptExtra = '',
  digest = null,
  availableSources = []
}) {
  const prefs = normalizePreferences(preferences);
  return `You are Worldwire Presenter — a conversational news desk for one reader.

You help the user:
1) understand recent events from the briefing corpus
2) refine interests / disinterests / sources / viewpoints / tone
3) request new source RSS feeds or presenter behaviors

Rules:
- Be direct and specific. No filler.
- When the user expresses preference changes, acknowledge them and emit a machine patch.
- You may suggest sources, but do not claim a feed was added until the patch is applied.
- Ground factual claims in the briefing/events context when available.
- If asked for something outside the corpus, say what you don't know.

Current preferences:
${preferencesPromptBlock(prefs)}

${systemPromptExtra ? `Extra directives:\n${systemPromptExtra}\n` : ''}

Available roster sources:
${availableSources.map((s) => `- ${s}`).join('\n') || '(none loaded)'}

${digest ? `Latest briefing headline: ${digest.headline}\nLede: ${digest.lede}` : 'No digest loaded yet.'}

When preferences should change, append EXACTLY one fenced block:
\`\`\`preference-patch
{
  "addInterests": [],
  "removeInterests": [],
  "addDisinterests": [],
  "removeDisinterests": [],
  "addPreferredSources": [],
  "removePreferredSources": [],
  "addMutedSources": [],
  "removeMutedSources": [],
  "addViewpoints": [],
  "removeViewpoints": [],
  "addBehaviors": [],
  "removeBehaviors": [],
  "tone": optional string,
  "depth": "briefing" or "deep",
  "appendInstructions": optional string,
  "customInstructions": optional full replace string,
  "addCustomFeeds": [{"name":"...", "url":"https://...rss"}],
  "removeCustomFeedUrls": []
}
\`\`\`
Only include keys you are changing. Do not invent URLs.`;
}

/**
 * Lightweight offline parser so preference memory still works before AI Gateway is enabled.
 */
export function heuristicPreferencePatch(message = '') {
  const text = String(message || '').trim();
  if (!text) return null;
  const patch = {};
  const lower = text.toLowerCase();

  const care = text.match(/(?:care about|interested in|focus on|prioritize|into)\s+(.+?)(?:\.|$)/i);
  if (care?.[1]) {
    patch.addInterests = care[1]
      .split(/,| and /i)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 80);
  }

  const dislike = text.match(/(?:dislike|ignore|mute|skip|bored of|less)\s+(.+?)(?:\.|$)/i);
  if (dislike?.[1]) {
    const bits = dislike[1]
      .split(/,| and /i)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 80);
    if (/source|bloomberg|nyt|ft|economist|bbc|wsj|ars/i.test(dislike[1])) {
      patch.addMutedSources = bits;
    } else {
      patch.addDisinterests = bits;
    }
  }

  if (/deeper|more depth|deep dive/i.test(lower)) patch.depth = 'deep';
  if (/brief|shorter|concise/i.test(lower)) patch.depth = 'briefing';
  if (/calm|skeptical|analytical|blunt/.test(lower)) {
    const tones = [];
    if (/calm/.test(lower)) tones.push('calm');
    if (/skeptical/.test(lower)) tones.push('skeptical');
    if (/analytical/.test(lower)) tones.push('analytical');
    if (/blunt/.test(lower)) tones.push('blunt');
    if (tones.length) patch.tone = tones.join(', ');
  }

  return Object.keys(patch).length ? patch : null;
}

export async function runPresenterChat({
  preferences,
  systemPromptExtra,
  history,
  userMessage,
  digest,
  availableSources
}) {
  const system = buildChatSystemPrompt({
    preferences,
    systemPromptExtra,
    digest,
    availableSources
  });

  const messages = [
    ...(history || []).slice(-16).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 6000)
    })),
    { role: 'user', content: String(userMessage || '').slice(0, 6000) }
  ];

  const result = await chatCompletion({
    system,
    messages,
    temperature: 0.45,
    maxTokens: 1800
  });

  if (!result.ok) {
    const patch = heuristicPreferencePatch(userMessage);
    const nextPrefs = patch
      ? mergePreferencePatch(preferences, patch)
      : normalizePreferences(preferences);
    const bits = [];
    if (patch?.addInterests?.length) bits.push(`interests + ${patch.addInterests.join(', ')}`);
    if (patch?.addDisinterests?.length) bits.push(`disinterests + ${patch.addDisinterests.join(', ')}`);
    if (patch?.addMutedSources?.length) bits.push(`muted ${patch.addMutedSources.join(', ')}`);
    if (patch?.tone) bits.push(`tone → ${patch.tone}`);
    if (patch?.depth) bits.push(`depth → ${patch.depth}`);

    return {
      ok: false,
      error: result.error,
      missingKey: result.missingKey,
      reply: patch
        ? `AI Gateway is not enabled yet, so I applied a simple local preference update (${bits.join('; ')}). Enable AI on the Netlify site for full presenter chat and smarter briefings.`
        : 'The presenter model is unavailable right now (enable Netlify AI Gateway). Say things like “I care about chip export controls” or “dislike celebrity news” and I can still update memory locally.',
      patch,
      preferences: nextPrefs,
      model: result.model,
      customFeedsToAdd: [],
      customFeedsToRemove: []
    };
  }

  const { cleanText, patch } = extractPreferencePatch(result.content);
  const nextPrefs = patch
    ? mergePreferencePatch(preferences, patch)
    : normalizePreferences(preferences);

  return {
    ok: true,
    reply: cleanText || result.content,
    patch,
    preferences: nextPrefs,
    model: result.model,
    customFeedsToAdd: Array.isArray(patch?.addCustomFeeds) ? patch.addCustomFeeds : [],
    customFeedsToRemove: Array.isArray(patch?.removeCustomFeedUrls)
      ? patch.removeCustomFeedUrls
      : []
  };
}
