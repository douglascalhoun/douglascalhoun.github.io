/**
 * Normalize harvested comments into a shared shape for storage + UI.
 */

export function emptyResult({
  platform = 'unknown',
  status = 'unsupported',
  message = null,
  sourceThreadUrl = null
} = {}) {
  return {
    platform,
    status,
    message,
    sourceThreadUrl,
    commentCount: 0,
    parentCount: 0,
    replyCount: 0,
    comments: [],
    meta: {}
  };
}

export function makeComment({
  externalId,
  parentExternalId = null,
  author = null,
  authorLocation = null,
  body = '',
  createdAt = null,
  score = 0,
  replyCount = 0,
  depth = 0,
  permalink = null,
  isEditorsPick = false,
  metadata = {}
}) {
  return {
    externalId: String(externalId),
    parentExternalId: parentExternalId == null ? null : String(parentExternalId),
    author: author || 'Anonymous',
    authorLocation: authorLocation || null,
    body: body || '',
    createdAt: createdAt ? new Date(createdAt) : null,
    score: Number(score) || 0,
    replyCount: Number(replyCount) || 0,
    depth: Number(depth) || 0,
    permalink,
    isEditorsPick: Boolean(isEditorsPick),
    metadata
  };
}

export function summarizeTree(comments) {
  const parentCount = comments.filter((c) => !c.parentExternalId).length;
  const replyCount = comments.length - parentCount;
  return {
    commentCount: comments.length,
    parentCount,
    replyCount
  };
}

export function nestComments(flatComments) {
  const byId = new Map();
  const roots = [];

  for (const comment of flatComments) {
    byId.set(comment.externalId || comment.external_id, {
      ...comment,
      externalId: comment.externalId || comment.external_id,
      parentExternalId: comment.parentExternalId ?? comment.parent_external_id ?? null,
      authorLocation: comment.authorLocation ?? comment.author_location ?? null,
      createdAt: comment.createdAt || comment.created_at,
      replyCount: comment.replyCount ?? comment.reply_count ?? 0,
      isEditorsPick: comment.isEditorsPick ?? comment.is_editors_pick ?? false,
      replies: []
    });
  }

  for (const node of byId.values()) {
    if (node.parentExternalId && byId.has(node.parentExternalId)) {
      byId.get(node.parentExternalId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (list) => {
    list.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff) return scoreDiff;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    for (const item of list) sortRecursive(item.replies);
  };
  sortRecursive(roots);
  return roots;
}
