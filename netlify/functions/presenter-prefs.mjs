import { getDatabase } from './lib/db.mjs';
import { ensurePresenterSchema } from './lib/presenter/schema.mjs';
import {
  ensureUserProfile,
  normalizePreferences,
  updateUserPreferences,
  mergePreferencePatch
} from './lib/presenter/prefs.mjs';
import { handleOptions, jsonResponse, readUserId } from './lib/cors.mjs';

export default async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const db = await getDatabase();
    await ensurePresenterSchema(db);

    if (req.method === 'GET') {
      const userId = readUserId(req);
      if (!userId) return jsonResponse({ error: 'userId required' }, { status: 400 });
      const profile = await ensureUserProfile(db, userId);
      const feeds = await db.query(
        `SELECT id, name, url, active, notes, created_at
         FROM custom_feeds WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return jsonResponse({
        userId,
        preferences: profile.preferences,
        systemPromptExtra: profile.system_prompt_extra || '',
        lastVisitedAt: profile.last_visited_at,
        lastDigestAt: profile.last_digest_at,
        customFeeds: feeds.rows
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const userId = readUserId(req, body);
      if (!userId) return jsonResponse({ error: 'userId required' }, { status: 400 });

      const profile = await ensureUserProfile(db, userId);
      let next = profile.preferences;
      if (body.preferences) next = normalizePreferences(body.preferences);
      if (body.patch) next = mergePreferencePatch(next, body.patch);

      const updated = await updateUserPreferences(db, userId, next, {
        systemPromptExtra:
          typeof body.systemPromptExtra === 'string' ? body.systemPromptExtra : undefined
      });

      // Optional custom feed mutations
      if (Array.isArray(body.addCustomFeeds)) {
        for (const feed of body.addCustomFeeds) {
          if (!feed?.url || !feed?.name) continue;
          await db.query(
            `INSERT INTO custom_feeds (user_id, name, url, notes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, url) DO UPDATE SET name = EXCLUDED.name, active = true`,
            [userId, String(feed.name).slice(0, 120), String(feed.url).slice(0, 500), feed.notes || null]
          );
        }
      }
      if (Array.isArray(body.removeCustomFeedUrls)) {
        for (const url of body.removeCustomFeedUrls) {
          await db.query(
            `UPDATE custom_feeds SET active = false WHERE user_id = $1 AND url = $2`,
            [userId, String(url)]
          );
        }
      }

      const feeds = await db.query(
        `SELECT id, name, url, active, notes, created_at
         FROM custom_feeds WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      return jsonResponse({
        userId,
        preferences: updated.preferences,
        systemPromptExtra: updated.system_prompt_extra || '',
        customFeeds: feeds.rows
      });
    }

    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('presenter-prefs error', error);
    return jsonResponse({ error: error.message || 'prefs failed' }, { status: 500 });
  }
};
