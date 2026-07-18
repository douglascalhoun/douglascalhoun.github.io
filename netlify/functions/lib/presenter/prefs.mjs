export const DEFAULT_PREFERENCES = {
  interests: [],
  disinterests: [],
  preferredSources: [],
  mutedSources: [],
  viewpoints: [],
  tone: 'concise, analytical, calm',
  depth: 'briefing', // briefing | deep
  includeCommentsHints: false,
  customInstructions: '',
  requestedBehaviors: []
};

export function normalizePreferences(raw = {}) {
  const base = { ...DEFAULT_PREFERENCES, ...(raw || {}) };
  const asList = (v) =>
    Array.isArray(v)
      ? [...new Set(v.map((x) => String(x).trim()).filter(Boolean))].slice(0, 40)
      : [];

  return {
    interests: asList(base.interests),
    disinterests: asList(base.disinterests),
    preferredSources: asList(base.preferredSources),
    mutedSources: asList(base.mutedSources),
    viewpoints: asList(base.viewpoints),
    tone: String(base.tone || DEFAULT_PREFERENCES.tone).slice(0, 200),
    depth: base.depth === 'deep' ? 'deep' : 'briefing',
    includeCommentsHints: Boolean(base.includeCommentsHints),
    customInstructions: String(base.customInstructions || '').slice(0, 4000),
    requestedBehaviors: asList(base.requestedBehaviors)
  };
}

export function mergePreferencePatch(current, patch = {}) {
  const cur = normalizePreferences(current);
  const next = { ...cur };

  const addAll = (key, values) => {
    if (!Array.isArray(values)) return;
    next[key] = [...new Set([...(next[key] || []), ...values.map(String)])].slice(0, 40);
  };
  const removeAll = (key, values) => {
    if (!Array.isArray(values)) return;
    const drop = new Set(values.map((v) => String(v).toLowerCase()));
    next[key] = (next[key] || []).filter((v) => !drop.has(String(v).toLowerCase()));
  };

  if (patch.set && typeof patch.set === 'object') {
    for (const [k, v] of Object.entries(patch.set)) {
      if (k in DEFAULT_PREFERENCES) next[k] = v;
    }
  }

  addAll('interests', patch.addInterests);
  removeAll('interests', patch.removeInterests);
  addAll('disinterests', patch.addDisinterests);
  removeAll('disinterests', patch.removeDisinterests);
  addAll('preferredSources', patch.addPreferredSources);
  removeAll('preferredSources', patch.removePreferredSources);
  addAll('mutedSources', patch.addMutedSources);
  removeAll('mutedSources', patch.removeMutedSources);
  addAll('viewpoints', patch.addViewpoints);
  removeAll('viewpoints', patch.removeViewpoints);
  addAll('requestedBehaviors', patch.addBehaviors);
  removeAll('requestedBehaviors', patch.removeBehaviors);

  if (typeof patch.tone === 'string') next.tone = patch.tone;
  if (patch.depth === 'deep' || patch.depth === 'briefing') next.depth = patch.depth;
  if (typeof patch.customInstructions === 'string') {
    next.customInstructions = patch.customInstructions;
  }
  if (typeof patch.appendInstructions === 'string' && patch.appendInstructions.trim()) {
    next.customInstructions = `${next.customInstructions}\n${patch.appendInstructions.trim()}`.trim().slice(0, 4000);
  }
  if (typeof patch.includeCommentsHints === 'boolean') {
    next.includeCommentsHints = patch.includeCommentsHints;
  }

  return normalizePreferences(next);
}

export function preferencesPromptBlock(prefs) {
  const p = normalizePreferences(prefs);
  return [
    `Tone: ${p.tone}`,
    `Depth: ${p.depth}`,
    `Interests: ${p.interests.join('; ') || '(none yet)'}`,
    `Disinterests: ${p.disinterests.join('; ') || '(none)'}`,
    `Preferred sources: ${p.preferredSources.join('; ') || '(all active)'}`,
    `Muted sources: ${p.mutedSources.join('; ') || '(none)'}`,
    `Viewpoints / framing: ${p.viewpoints.join('; ') || '(none)'}`,
    `Presenter behaviors: ${p.requestedBehaviors.join('; ') || '(default)'}`,
    `Custom instructions:\n${p.customInstructions || '(none)'}`
  ].join('\n');
}

export async function ensureUserProfile(db, userId) {
  const id = String(userId || '').trim().slice(0, 120);
  if (!id) throw new Error('userId required');

  await db.query(
    `INSERT INTO user_profiles (user_id, preferences)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [id, JSON.stringify(DEFAULT_PREFERENCES)]
  );

  const result = await db.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [id]);
  const row = result.rows[0];
  return {
    ...row,
    preferences: normalizePreferences(row.preferences)
  };
}

export async function updateUserPreferences(db, userId, preferences, { systemPromptExtra } = {}) {
  const prefs = normalizePreferences(preferences);
  const result = await db.query(
    `UPDATE user_profiles
     SET preferences = $2::jsonb,
         system_prompt_extra = COALESCE($3, system_prompt_extra),
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, JSON.stringify(prefs), systemPromptExtra ?? null]
  );
  const row = result.rows[0];
  return { ...row, preferences: normalizePreferences(row.preferences) };
}

export async function touchLastVisited(db, userId, when = new Date()) {
  await db.query(
    `UPDATE user_profiles
     SET last_visited_at = $2, updated_at = NOW()
     WHERE user_id = $1`,
    [userId, when]
  );
}
