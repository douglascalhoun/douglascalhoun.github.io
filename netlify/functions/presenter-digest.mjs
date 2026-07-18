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
import {
  getDigestById,
  getLatestSubstantiveDigest,
  isSubstantiveDigest,
  listDigestArchive,
  rowToDigest
} from './lib/presenter/archive.mjs';
import { handleOptions, jsonResponse, readUserId } from './lib/cors.mjs';

async function withArchive(db, userId, payload, excludeId = null) {
  const archive = await listDigestArchive(db, userId, {
    limit: 20,
    excludeId: excludeId || payload.digestId || null
  });
  return { ...payload, archive };
}

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
    const requestedId = body.digestId || url.searchParams.get('digestId');

    // Explicit archive playback
    if (requestedId) {
      const past = await getDigestById(db, userId, requestedId);
      if (!past) {
        return jsonResponse({ error: 'Digest not found' }, { status: 404 });
      }
      return jsonResponse(
        await withArchive(
          db,
          userId,
          {
            userId,
            mode: 'archive',
            cached: true,
            replay: true,
            digestId: past.digestId,
            sinceAt: past.sinceAt,
            createdAt: past.createdAt,
            model: past.model,
            summaryMarkdown: past.summaryMarkdown,
            digest: past.digest,
            articleCount: past.eventCount,
            preferences: profile.preferences,
            lastVisitedAt: profile.last_visited_at,
            note: `Replaying briefing from ${new Date(past.createdAt).toLocaleString()}`
          },
          past.digestId
        )
      );
    }

    // Reuse a fresh digest unless forced
    if (!force) {
      const recent = await db.query(
        `SELECT * FROM digests
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '20 minutes'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (recent.rows[0]) {
        const parsed = rowToDigest(recent.rows[0]);
        if (isSubstantiveDigest(parsed.digest)) {
          return jsonResponse(
            await withArchive(
              db,
              userId,
              {
                userId,
                mode: 'fresh',
                cached: true,
                digestId: parsed.digestId,
                sinceAt: parsed.sinceAt,
                createdAt: parsed.createdAt,
                model: parsed.model,
                summaryMarkdown: parsed.summaryMarkdown,
                digest: parsed.digest,
                preferences: profile.preferences,
                lastVisitedAt: profile.last_visited_at
              },
              parsed.digestId
            )
          );
        }
      }
    }

    const sinceAt =
      body.sinceAt ||
      profile.last_visited_at ||
      new Date(Date.now() - 36 * 60 * 60 * 1000);

    let { since, articles } = await loadArticlesSince(db, {
      sinceAt,
      preferences: profile.preferences,
      limit: Number(body.limit || 48)
    });

    let generated = null;
    let digest = null;
    let mode = 'fresh';
    let widened = false;

    // Nothing new since last visit → prefer replaying a past report over regenerating.
    if (!articles.length) {
      const past = await getLatestSubstantiveDigest(db, userId);
      if (markVisit) await touchLastVisited(db, userId, new Date());

      if (past) {
        return jsonResponse(
          await withArchive(
            db,
            userId,
            {
              userId,
              mode: 'replay',
              cached: true,
              replay: true,
              digestId: past.digestId,
              sinceAt: past.sinceAt,
              createdAt: past.createdAt,
              model: past.model,
              summaryMarkdown: past.summaryMarkdown,
              digest: {
                ...past.digest,
                lede:
                  past.digest.lede ||
                  'No strong new stories since your last visit — replaying your latest briefing.'
              },
              articleCount: 0,
              fallback: false,
              preferences: profile.preferences,
              lastVisitedAt: markVisit ? new Date().toISOString() : profile.last_visited_at,
              note: 'Nothing new since your last visit — showing your latest past briefing.'
            },
            past.digestId
          )
        );
      }

      // No archive yet: widen once so first-time visitors still get a desk.
      const widenedSince = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const retry = await loadArticlesSince(db, {
        sinceAt: widenedSince,
        preferences: profile.preferences,
        limit: Number(body.limit || 48)
      });
      if (retry.articles.length) {
        since = retry.since;
        articles = retry.articles;
        widened = true;
      } else {
        return jsonResponse(
          await withArchive(db, userId, {
            userId,
            mode: 'empty',
            cached: false,
            digestId: null,
            sinceAt: since,
            createdAt: new Date().toISOString(),
            model: null,
            summaryMarkdown: '',
            digest: {
              headline: 'Quiet desk',
              lede: 'No new stories matched your filters, and there are no past briefings to replay yet. Crawl sources or widen interests.',
              events: [],
              watchlist: ['Crawl + scrape, then refresh briefing.', 'Ask the desk to broaden topics.'],
              ignoredNote: null
            },
            articleCount: 0,
            preferences: profile.preferences,
            lastVisitedAt: markVisit ? new Date().toISOString() : profile.last_visited_at,
            note: 'No new news and no past reports yet.'
          })
        );
      }
    }

    if (articles.length) {
      generated = await generateDigest({
        articles,
        preferences: profile.preferences,
        systemPromptExtra: profile.system_prompt_extra || '',
        since
      });
      digest = generated.digest;
    }

    // Generated quiet/empty → still fall back to archive
    if (!isSubstantiveDigest(digest)) {
      const past = await getLatestSubstantiveDigest(db, userId);
      if (markVisit) await touchLastVisited(db, userId, new Date());
      if (past) {
        return jsonResponse(
          await withArchive(
            db,
            userId,
            {
              userId,
              mode: 'replay',
              cached: true,
              replay: true,
              digestId: past.digestId,
              sinceAt: past.sinceAt,
              createdAt: past.createdAt,
              model: past.model,
              summaryMarkdown: past.summaryMarkdown,
              digest: past.digest,
              articleCount: 0,
              preferences: profile.preferences,
              lastVisitedAt: markVisit ? new Date().toISOString() : profile.last_visited_at,
              note: 'Nothing new since your last visit — showing your latest past briefing.'
            },
            past.digestId
          )
        );
      }
      return jsonResponse(
        await withArchive(db, userId, {
          userId,
          mode: 'empty',
          digest: digest || {
            headline: 'Quiet desk',
            lede: 'No new stories matched your filters.',
            events: [],
            watchlist: [],
            ignoredNote: null
          },
          preferences: profile.preferences,
          note: 'No new news and no past reports yet.'
        })
      );
    }

    if (widened) {
      mode = 'catchup';
      digest = {
        ...digest,
        lede:
          digest.lede ||
          'Catch-up briefing — little was new since your last visit, so this covers the last ~72 hours.'
      };
    }

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
        generated?.model || null
      ]
    );

    await db.query(
      `UPDATE user_profiles SET last_digest_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    if (markVisit) {
      await touchLastVisited(db, userId, new Date());
    }

    return jsonResponse(
      await withArchive(
        db,
        userId,
        {
          userId,
          mode,
          cached: false,
          replay: false,
          digestId: inserted.rows[0].id,
          sinceAt: since,
          createdAt: inserted.rows[0].created_at,
          model: generated?.model || null,
          fallback: Boolean(generated?.fallback),
          aiError: generated?.error || null,
          missingKey: Boolean(generated?.missingKey),
          articleCount: articles.length,
          summaryMarkdown,
          digest,
          preferences: profile.preferences,
          lastVisitedAt: markVisit ? new Date().toISOString() : profile.last_visited_at,
          note: widened
            ? 'Little was new since your last visit — catch-up briefing from the last ~72 hours.'
            : null
        },
        inserted.rows[0].id
      )
    );
  } catch (error) {
    console.error('presenter-digest error', error);
    return jsonResponse({ error: error.message || 'digest failed' }, { status: 500 });
  }
};
