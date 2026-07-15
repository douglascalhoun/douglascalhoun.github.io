import { fetchJson, fetchText } from '../http.mjs';
import { cleanText } from '../../text.mjs';
import { emptyResult, makeComment, summarizeTree } from '../normalize.mjs';

function extractShortUrlKey(html, articleUrl) {
  const fromHtml =
    html.match(/https?:\/\/(?:www\.)?gu\.com(\/p\/[a-z0-9]+)/i)?.[1]
    || html.match(/"shortUrl"\s*:\s*"https?:\\\/\\\/gu\.com(\\\/p\\\/[a-z0-9]+)"/i)?.[1]?.replace(/\\\//g, '/')
    || html.match(/data-discussion-key="(\/p\/[a-z0-9]+)"/i)?.[1]
    || html.match(/discussionKey["\s:]+["'](\/p\/[a-z0-9]+)["']/i)?.[1];
  if (fromHtml) return fromHtml;

  // Rare: short URL already in the link
  const fromLink = articleUrl.match(/gu\.com(\/p\/[a-z0-9]+)/i)?.[1];
  return fromLink || null;
}

function mapGuardianComment(raw) {
  return makeComment({
    externalId: raw.id,
    parentExternalId: raw.responseTo || null,
    author: raw.userProfile?.displayName || raw.userProfile?.userId || 'Guardian Reader',
    body: cleanText(raw.body || ''),
    createdAt: raw.isoDateTime || raw.date || null,
    score: raw.numRecommends || 0,
    replyCount: raw.metaData?.responseCount || 0,
    depth: 0,
    permalink: raw.webUrl || null,
    isEditorsPick: Boolean(raw.isHighlighted),
    metadata: {
      status: raw.status,
      responses: raw.responses?.length || 0
    }
  });
}

/**
 * Guardian Discussion API — public, no key required.
 * Useful if Guardian feeds are re-enabled; also works for pasted Guardian URLs.
 */
export async function harvestGuardianComments(articleUrl) {
  const page = await fetchText(articleUrl);
  if (!page.ok) {
    return emptyResult({
      platform: 'guardian',
      status: 'error',
      message: `Could not load Guardian article (HTTP ${page.status})`
    });
  }

  const key = extractShortUrlKey(page.text, articleUrl);
  if (!key) {
    return emptyResult({
      platform: 'guardian',
      status: 'unsupported',
      message: 'Could not find a Guardian discussion key for this story'
    });
  }

  const discussionUrl =
    `https://discussion.theguardian.com/discussion-api/discussion/${encodeURIComponent(key)}` +
    `?orderBy=newest&pageSize=100&displayThreaded=true`;

  const result = await fetchJson(discussionUrl);
  if (!result.ok || !result.data) {
    return emptyResult({
      platform: 'guardian',
      status: result.status === 404 ? 'empty' : 'error',
      message: result.status === 404
        ? 'No discussion found for this Guardian story'
        : `Guardian discussion HTTP ${result.status}`,
      sourceThreadUrl: `https://www.theguardian.com${key}`
    });
  }

  if (result.data.statusCode && result.data.statusCode >= 400) {
    return emptyResult({
      platform: 'guardian',
      status: result.data.errorCode === 'DISCUSSION_NOT_FOUND' ? 'empty' : 'error',
      message: result.data.message || 'Guardian discussion unavailable',
      sourceThreadUrl: `https://discussion.theguardian.com/discussion-api/discussion/${key}`
    });
  }

  const discussion = result.data.discussion || result.data;
  const commentsRaw = discussion.comments || [];
  const flat = [];

  const walk = (list, parentId = null, depth = 0) => {
    for (const raw of list || []) {
      const mapped = mapGuardianComment({ ...raw, responseTo: parentId || raw.responseTo });
      mapped.depth = depth;
      flat.push(mapped);
      if (raw.responses?.length) walk(raw.responses, String(raw.id), depth + 1);
    }
  };
  walk(commentsRaw);

  const summary = summarizeTree(flat);
  const count = Number(discussion.commentCount) || summary.commentCount;

  return {
    platform: 'guardian',
    status: flat.length ? 'ok' : 'empty',
    message: flat.length ? null : 'Discussion is open but has no comments yet',
    sourceThreadUrl: discussion.webUrl || `https://www.theguardian.com${key}`,
    commentCount: count,
    parentCount: summary.parentCount,
    replyCount: summary.replyCount,
    comments: flat,
    meta: {
      discussionKey: key,
      isClosed: Boolean(discussion.isClosedForComments)
    }
  };
}
