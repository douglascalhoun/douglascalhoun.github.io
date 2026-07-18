export function rowToDigest(row) {
  if (!row) return null;
  const payload = row.events && typeof row.events === 'object' ? row.events : {};
  const events = Array.isArray(payload.events)
    ? payload.events
    : Array.isArray(payload)
      ? payload
      : [];
  return {
    digestId: row.id,
    sinceAt: row.since_at,
    createdAt: row.created_at,
    model: row.model,
    summaryMarkdown: row.summary_markdown,
    digest: {
      headline: payload.headline || 'Briefing',
      lede: payload.lede || '',
      events,
      watchlist: payload.watchlist || [],
      ignoredNote: payload.ignoredNote || null
    },
    eventCount: events.length
  };
}

export function isSubstantiveDigest(digest) {
  return Boolean(digest?.events?.length);
}

export async function listDigestArchive(db, userId, { limit = 20, excludeId = null } = {}) {
  const result = await db.query(
    `SELECT id, since_at, created_at, model, summary_markdown, events
     FROM digests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 60`,
    [userId]
  );

  const items = [];
  for (const row of result.rows) {
    const parsed = rowToDigest(row);
    if (!isSubstantiveDigest(parsed.digest)) continue;
    if (excludeId && row.id === excludeId) continue;
    items.push({
      id: row.id,
      createdAt: row.created_at,
      sinceAt: row.since_at,
      headline: parsed.digest.headline,
      lede: parsed.digest.lede,
      eventCount: parsed.eventCount,
      model: row.model
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function getDigestById(db, userId, digestId) {
  const result = await db.query(
    `SELECT * FROM digests WHERE user_id = $1 AND id = $2 LIMIT 1`,
    [userId, digestId]
  );
  return rowToDigest(result.rows[0] || null);
}

export async function getLatestSubstantiveDigest(db, userId) {
  const result = await db.query(
    `SELECT * FROM digests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 40`,
    [userId]
  );
  for (const row of result.rows) {
    const parsed = rowToDigest(row);
    if (isSubstantiveDigest(parsed.digest)) return parsed;
  }
  return null;
}
