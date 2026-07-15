const CACHE_TTL_MS = 30 * 60 * 1000;

export function isSnapshotFresh(snapshot, { force = false } = {}) {
  if (force || !snapshot) return false;
  if (snapshot.expires_at) {
    return new Date(snapshot.expires_at).getTime() > Date.now();
  }
  if (!snapshot.fetched_at) return false;
  return Date.now() - new Date(snapshot.fetched_at).getTime() < CACHE_TTL_MS;
}

export async function getArticleForComments(db, articleId) {
  const result = await db.query(
    `SELECT a.id, a.title, a.link, a.guid, f.name as feed_name, f.url as feed_url
     FROM articles a
     JOIN feeds f ON f.id = a.feed_id
     WHERE a.id = $1`,
    [articleId]
  );
  return result.rows[0] || null;
}

export async function getCommentSnapshot(db, articleId) {
  const result = await db.query(
    `SELECT * FROM article_comment_snapshots WHERE article_id = $1`,
    [articleId]
  );
  return result.rows[0] || null;
}

export async function getStoredComments(db, articleId) {
  const result = await db.query(
    `SELECT *
     FROM article_comments
     WHERE article_id = $1
     ORDER BY sort_order ASC, created_at DESC NULLS LAST`,
    [articleId]
  );
  return result.rows;
}

export async function saveHarvest(db, articleId, harvest) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
  await db.query(
    `INSERT INTO article_comment_snapshots
      (article_id, platform, status, comment_count, parent_count, reply_count,
       source_thread_url, error_message, fetched_at, expires_at, raw_meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10::jsonb)
     ON CONFLICT (article_id) DO UPDATE SET
       platform = EXCLUDED.platform,
       status = EXCLUDED.status,
       comment_count = EXCLUDED.comment_count,
       parent_count = EXCLUDED.parent_count,
       reply_count = EXCLUDED.reply_count,
       source_thread_url = EXCLUDED.source_thread_url,
       error_message = EXCLUDED.error_message,
       fetched_at = NOW(),
       expires_at = EXCLUDED.expires_at,
       raw_meta = EXCLUDED.raw_meta`,
    [
      articleId,
      harvest.platform,
      harvest.status,
      harvest.commentCount || 0,
      harvest.parentCount || 0,
      harvest.replyCount || 0,
      harvest.sourceThreadUrl || null,
      harvest.message || null,
      expiresAt.toISOString(),
      JSON.stringify(harvest.meta || {})
    ]
  );

  await db.query(`DELETE FROM article_comments WHERE article_id = $1`, [articleId]);

  const comments = harvest.comments || [];
  for (let i = 0; i < comments.length; i += 1) {
    const c = comments[i];
    await db.query(
      `INSERT INTO article_comments
        (article_id, external_id, parent_external_id, author, author_location, body,
         created_at, score, reply_count, depth, permalink, is_editors_pick, sort_order, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
       ON CONFLICT (article_id, external_id) DO UPDATE SET
         parent_external_id = EXCLUDED.parent_external_id,
         author = EXCLUDED.author,
         author_location = EXCLUDED.author_location,
         body = EXCLUDED.body,
         created_at = EXCLUDED.created_at,
         score = EXCLUDED.score,
         reply_count = EXCLUDED.reply_count,
         depth = EXCLUDED.depth,
         permalink = EXCLUDED.permalink,
         is_editors_pick = EXCLUDED.is_editors_pick,
         sort_order = EXCLUDED.sort_order,
         metadata = EXCLUDED.metadata`,
      [
        articleId,
        c.externalId,
        c.parentExternalId,
        c.author,
        c.authorLocation,
        c.body,
        c.createdAt,
        c.score || 0,
        c.replyCount || 0,
        c.depth || 0,
        c.permalink,
        c.isEditorsPick || false,
        i,
        JSON.stringify(c.metadata || {})
      ]
    );
  }
}

export function serializeSnapshot(snapshot, comments, { nested = true } = {}) {
  if (!snapshot) return null;
  const flat = (comments || []).map((row) => ({
    id: row.id,
    externalId: row.external_id,
    parentExternalId: row.parent_external_id,
    author: row.author,
    authorLocation: row.author_location,
    body: row.body,
    createdAt: row.created_at,
    score: row.score,
    replyCount: row.reply_count,
    depth: row.depth,
    permalink: row.permalink,
    isEditorsPick: row.is_editors_pick,
    metadata: row.metadata || {}
  }));

  return {
    platform: snapshot.platform,
    status: snapshot.status,
    commentCount: snapshot.comment_count,
    parentCount: snapshot.parent_count,
    replyCount: snapshot.reply_count,
    sourceThreadUrl: snapshot.source_thread_url,
    message: snapshot.error_message,
    fetchedAt: snapshot.fetched_at,
    expiresAt: snapshot.expires_at,
    meta: snapshot.raw_meta || {},
    comments: nested ? nestFromFlat(flat) : flat
  };
}

function nestFromFlat(flat) {
  const byId = new Map();
  const roots = [];
  for (const comment of flat) {
    byId.set(comment.externalId, { ...comment, replies: [] });
  }
  for (const node of byId.values()) {
    if (node.parentExternalId && byId.has(node.parentExternalId)) {
      byId.get(node.parentExternalId).replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
