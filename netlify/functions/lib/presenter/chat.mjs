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
    return {
      ok: false,
      error: result.error,
      missingKey: result.missingKey,
      reply:
        'The presenter model is unavailable right now (AI Gateway key/model). Your preferences were not changed. Try again after AI is enabled on the Netlify site.',
      patch: null,
      preferences: normalizePreferences(preferences),
      model: result.model
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
