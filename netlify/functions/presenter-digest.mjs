import { getDatabase } from './lib/db.mjs';
import { ensurePresenterSchema } from './lib/presenter/schema.mjs';
import {
  ensureUserProfile,
  touchLastVisited
} from './lib/presenter/prefs.mjs';
import {
  loadArticlesSince,
  generateDigest,
  digestToMarkdown
} from './lib/presenter/digest.mjs';
import { handleOptions, jsonResponse, readUserId } from './lib/cors.mjs';

export default async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = await getDatabase();
    await ensurePresenterSchema(db);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const userId = readUserId(req, body);
    if (!userId) return jsonResponse({ error: 'userId required' }, { status: 400 });

    const profile = await ensureUserProfile(db, userId);
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1' || body.force === true;
    const markVisit = body.markVisit !== false;

    // Reuse a fresh digest unless forced
    if (!force) {
      const recent = await db.query(
        `SELECT * FROM digests
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '20 minutes'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (recent.rows[0]) {
        const row = recent.rows[0];
        return jsonResponse({
          userId,
          cached: true,
          digestId: row.id,
          sinceAt: row.since_at,
          createdAt: row.created_at,
          model: row.model,
          summaryMarkdown: row.summary_markdown,
          digest: {
            headline: row.events?.headline || 'Briefing',
            lede: row.events?.lede || '',
            events: row.events?.events || row.events || [],
            watchlist: row.events?.watchlist || [],
            ignoredNote: row.events?.ignoredNote || null
          },
          preferences: profile.preferences,
          lastVisitedAt: profile.last_visited_at
        });
      }
    }

    const sinceAt =
      body.sinceAt ||
      profile.last_visited_at ||
      new Date(Date.now() - 36 * 60 * 60 * 1000);

    const { since, articles } = await loadArticlesSince(db, {
      sinceAt,
      preferences: profile.preferences,
      limit: Number(body.limit || 48)
    });

    const generated = await generateDigest({
      articles,
      preferences: profile.preferences,
      systemPromptExtra: profile.system_prompt_extra || '',
      since
    });

    const digest = generated.digest;
    const summaryMarkdown = digestToMarkdown(digest);
    const articleIds = [
      ...new Set(
        (digest.events || []).flatMap((e) => (e.articles || []).map((a) => a.id)).filter(Boolean)
      )
    ];

    const storedPayload = {
      headline: digest.headline,
      lede: digest.lede,
      events: digest.events,
      watchlist: digest.watchlist,
      ignoredNote: digest.ignoredNote
    };

    const inserted = await db.query(
      `INSERT INTO digests (user_id, since_at, summary_markdown, events, article_ids, model)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING id, created_at`,
      [
        userId,
        since,
        summaryMarkdown,
        JSON.stringify(storedPayload),
        articleIds,
        generated.model || null
      ]
    );

    await db.query(
      `UPDATE user_profiles SET last_digest_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    if (markVisit) {
      await touchLastVisited(db, userId, new Date());
    }

    return jsonResponse({
      userId,
      cached: false,
      digestId: inserted.rows[0].id,
      sinceAt: since,
      createdAt: inserted.rows[0].created_at,
      model: generated.model,
      fallback: Boolean(generated.fallback),
      aiError: generated.error || null,
      missingKey: Boolean(generated.missingKey),
      articleCount: articles.length,
      summaryMarkdown,
      digest,
      preferences: profile.preferences,
      lastVisitedAt: markVisit ? new Date().toISOString() : profile.last_visited_at
    });
  } catch (error) {
    console.error('presenter-digest error', error);
    return jsonResponse({ error: error.message || 'digest failed' }, { status: 500 });
  }
};
