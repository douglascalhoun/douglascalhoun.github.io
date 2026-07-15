import { fetchJson } from '../http.mjs';
import { cleanText } from '../../text.mjs';
import { emptyResult, makeComment, summarizeTree } from '../normalize.mjs';

const PAGE_SIZE = 25;
const MAX_PAGES = 8;

function encodeArticleUrl(url) {
  return encodeURIComponent(url);
}

function flattenNytComment(raw, depth = 1, out = []) {
  const createdMs = raw.createDate ? Number(raw.createDate) * 1000 : null;
  out.push(
    makeComment({
      externalId: raw.commentID ?? raw.permID,
      parentExternalId: raw.parentID || null,
      author: raw.userDisplayName || 'NYT Reader',
      authorLocation: raw.userLocation && raw.userLocation !== 'NULL' ? raw.userLocation : null,
      body: cleanText(String(raw.commentBody || '').replace(/<br\s*\/?>/gi, '\n')),
      createdAt: createdMs,
      score: raw.recommendations || 0,
      replyCount: raw.replyCount || 0,
      depth: raw.depth || depth,
      permalink: null,
      isEditorsPick: Boolean(raw.editorsSelection),
      metadata: {
        trusted: Boolean(raw.trusted),
        commentType: raw.commentType || 'comment'
      }
    })
  );
  for (const reply of raw.replies || []) {
    flattenNytComment(reply, (raw.depth || depth) + 1, out);
  }
  return out;
}

async function fetchPage(articleUrl, offset, sort = 'reader') {
  const endpoint =
    `https://www.nytimes.com/svc/community/V3/requestHandler` +
    `?cmd=GetCommentsAll&url=${encodeArticleUrl(articleUrl)}` +
    `&sort=${encodeURIComponent(sort)}&offset=${offset}&limit=${PAGE_SIZE}`;

  const result = await fetchJson(endpoint);
  if (!result.ok || !result.data) {
    return {
      ok: false,
      status: result.status,
      message: `NYT comments HTTP ${result.status}`
    };
  }
  if (result.data.status && result.data.status !== 'OK') {
    return {
      ok: false,
      status: result.status,
      message: result.data.message || `NYT status ${result.data.status}`
    };
  }
  return { ok: true, payload: result.data.results || {} };
}

/**
 * Harvest NYT reader comments via the public community requestHandler.
 * No developer API key required; works for article URLs with open comments.
 */
export async function harvestNytComments(articleUrl) {
  const first = await fetchPage(articleUrl, 0, 'reader');
  if (!first.ok) {
    if (first.status === 403 || first.status === 401) {
      return emptyResult({
        platform: 'nyt',
        status: 'error',
        message: first.message || 'NYT blocked the comments request'
      });
    }
    return emptyResult({
      platform: 'nyt',
      status: 'error',
      message: first.message || 'Failed to load NYT comments'
    });
  }

  const payload = first.payload;
  const totalParent = Number(payload.totalParentCommentsFound) || 0;
  const totalAll = Number(payload.totalCommentsFound) || 0;

  if (!totalAll) {
    return {
      ...emptyResult({
        platform: 'nyt',
        status: 'empty',
        message: 'No public comments on this NYT story yet',
        sourceThreadUrl: articleUrl
      }),
      meta: {
        totalCommentsFound: 0,
        sort: 'reader'
      }
    };
  }

  const flat = [];
  const ingest = (rawList) => {
    for (const raw of rawList || []) {
      flattenNytComment(raw, 1, flat);
    }
  };

  ingest(payload.comments);

  let offset = PAGE_SIZE;
  let pages = 1;
  while (offset < totalParent && pages < MAX_PAGES) {
    const page = await fetchPage(articleUrl, offset, 'reader');
    if (!page.ok) break;
    ingest(page.payload.comments);
    offset += PAGE_SIZE;
    pages += 1;
  }

  // Deduplicate by external id (replies may appear twice)
  const seen = new Set();
  const comments = [];
  for (const c of flat) {
    if (seen.has(c.externalId)) continue;
    seen.add(c.externalId);
    comments.push(c);
  }

  const summary = summarizeTree(comments);
  return {
    platform: 'nyt',
    status: 'ok',
    message: null,
    sourceThreadUrl: articleUrl,
    commentCount: Math.max(summary.commentCount, totalAll),
    parentCount: Math.max(summary.parentCount, totalParent),
    replyCount: Math.max(summary.replyCount, Number(payload.totalReplyCommentsFound) || 0),
    comments,
    meta: {
      totalCommentsFound: totalAll,
      totalParentCommentsFound: totalParent,
      pagesFetched: pages,
      sort: 'reader',
      truncated: totalParent > pages * PAGE_SIZE
    }
  };
}
