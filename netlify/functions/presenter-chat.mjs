import { getDatabase } from './lib/db.mjs';
import { ensurePresenterSchema } from './lib/presenter/schema.mjs';
import {
  ensureUserProfile,
  updateUserPreferences
} from './lib/presenter/prefs.mjs';
import { runPresenterChat } from './lib/presenter/chat.mjs';
import { handleOptions, jsonResponse, readUserId } from './lib/cors.mjs';
import { getActiveFeeds } from './lib/db.mjs';

export default async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method === 'GET') {
    try {
      const db = await getDatabase();
      await ensurePresenterSchema(db);
      const userId = readUserId(req);
      if (!userId) return jsonResponse({ error: 'userId required' }, { status: 400 });
      await ensureUserProfile(db, userId);
      const rows = await db.query(
        `SELECT id, role, content, meta, created_at
         FROM presenter_messages
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 40`,
        [userId]
      );
      return jsonResponse({
        userId,
        messages: rows.rows.reverse()
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, { status: 500 });
    }
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = await getDatabase();
    await ensurePresenterSchema(db);
    const body = await req.json().catch(() => ({}));
    const userId = readUserId(req, body);
    const message = String(body.message || '').trim();
    if (!userId) return jsonResponse({ error: 'userId required' }, { status: 400 });
    if (!message) return jsonResponse({ error: 'message required' }, { status: 400 });

    const profile = await ensureUserProfile(db, userId);

    const historyRows = await db.query(
      `SELECT role, content FROM presenter_messages
       WHERE user_id = $1 AND role IN ('user','assistant')
       ORDER BY created_at DESC LIMIT 16`,
      [userId]
    );
    const history = historyRows.rows.reverse();

    const digestRow = await db.query(
      `SELECT events, summary_markdown FROM digests
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const digest = digestRow.rows[0]?.events || null;

    const feeds = await getActiveFeeds(db);
    const availableSources = feeds.map((f) => f.name);

    const result = await runPresenterChat({
      preferences: profile.preferences,
      systemPromptExtra: profile.system_prompt_extra || '',
      history,
      userMessage: message,
      digest,
      availableSources
    });

    await db.query(
      `INSERT INTO presenter_messages (user_id, role, content, meta)
       VALUES ($1, 'user', $2, $3::jsonb)`,
      [userId, message, JSON.stringify({})]
    );

    let savedPrefs = profile.preferences;
    if (result.patch) {
      savedPrefs = result.preferences;
      await updateUserPreferences(db, userId, savedPrefs);

      for (const feed of result.customFeedsToAdd || []) {
        if (!feed?.url || !feed?.name) continue;
        await db.query(
          `INSERT INTO custom_feeds (user_id, name, url)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, url) DO UPDATE SET name = EXCLUDED.name, active = true`,
          [userId, String(feed.name).slice(0, 120), String(feed.url).slice(0, 500)]
        );
      }
      for (const url of result.customFeedsToRemove || []) {
        await db.query(
          `UPDATE custom_feeds SET active = false WHERE user_id = $1 AND url = $2`,
          [userId, String(url)]
        );
      }
    }

    await db.query(
      `INSERT INTO presenter_messages (user_id, role, content, meta)
       VALUES ($1, 'assistant', $2, $3::jsonb)`,
      [
        userId,
        result.reply,
        JSON.stringify({
          patch: result.patch || null,
          model: result.model || null,
          ok: result.ok
        })
      ]
    );

    return jsonResponse({
      userId,
      reply: result.reply,
      preferences: savedPrefs,
      patchApplied: Boolean(result.patch),
      patch: result.patch || null,
      model: result.model,
      ok: result.ok,
      missingKey: Boolean(result.missingKey),
      error: result.error || null
    });
  } catch (error) {
    console.error('presenter-chat error', error);
    return jsonResponse({ error: error.message || 'chat failed' }, { status: 500 });
  }
};
