import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Netlify AI Gateway-backed OpenAI client.
 * Do not set OPENAI_API_KEY yourself — Netlify injects gateway credentials.
 */
export function getOpenAI() {
  return new OpenAI();
}

export function getPresenterModel() {
  try {
    return Netlify.env.get('PRESENTER_MODEL') || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export async function chatCompletion({
  system,
  messages,
  temperature = 0.4,
  maxTokens = 2200,
  responseFormat = null
} = {}) {
  const openai = getOpenAI();
  const model = getPresenterModel();

  const payload = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, ...(messages || [])]
  };
  if (responseFormat) payload.response_format = responseFormat;

  try {
    const completion = await openai.chat.completions.create(payload);
    const content = completion.choices?.[0]?.message?.content || '';
    return { ok: true, content, model, usage: completion.usage || null };
  } catch (error) {
    const message = error?.message || String(error);
    return {
      ok: false,
      content: '',
      model,
      error: message,
      missingKey: /api key|authentication|401/i.test(message)
    };
  }
}

/**
 * Extract a fenced JSON preference patch from an assistant reply.
 * Format:
 * ```preference-patch
 * { ... }
 * ```
 */
export function extractPreferencePatch(text = '') {
  const match = String(text).match(/```preference-patch\s*([\s\S]*?)```/i);
  if (!match) return { cleanText: text, patch: null };
  let patch = null;
  try {
    patch = JSON.parse(match[1].trim());
  } catch {
    patch = null;
  }
  const cleanText = String(text)
    .replace(/```preference-patch\s*[\s\S]*?```/i, '')
    .trim();
  return { cleanText, patch };
}
