import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-4o-mini';

function readEnv(name) {
  try {
    return Netlify.env.get(name) || '';
  } catch {
    return '';
  }
}

/**
 * Netlify AI Gateway-backed OpenAI client.
 * Do not set OPENAI_API_KEY yourself — Netlify injects gateway credentials.
 */
export function getOpenAI() {
  const apiKey =
    readEnv('OPENAI_API_KEY') ||
    readEnv('NETLIFY_AI_GATEWAY_KEY') ||
    'netlify-ai-gateway-placeholder';
  const baseURL = readEnv('OPENAI_BASE_URL') || readEnv('NETLIFY_AI_GATEWAY_BASE_URL') || undefined;
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {})
  });
}

export function getPresenterModel() {
  return readEnv('PRESENTER_MODEL') || DEFAULT_MODEL;
}

export function aiGatewayConfigured() {
  return Boolean(
    readEnv('OPENAI_API_KEY') ||
      readEnv('NETLIFY_AI_GATEWAY_KEY') ||
      readEnv('OPENAI_BASE_URL') ||
      readEnv('NETLIFY_AI_GATEWAY_BASE_URL')
  );
}

export async function chatCompletion({
  system,
  messages,
  temperature = 0.4,
  maxTokens = 2200,
  responseFormat = null
} = {}) {
  const model = getPresenterModel();

  if (!aiGatewayConfigured()) {
    return {
      ok: false,
      content: '',
      model,
      error:
        'Netlify AI Gateway is not enabled for this site yet. Enable AI features in the Netlify UI and redeploy.',
      missingKey: true
    };
  }

  try {
    const openai = getOpenAI();
    const payload = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...(messages || [])]
    };
    if (responseFormat) payload.response_format = responseFormat;

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
      missingKey: /api key|credentials|authentication|401/i.test(message)
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
