import { fetchText } from '../http.mjs';
import { cleanText } from '../../text.mjs';
import { emptyResult, makeComment, summarizeTree } from '../normalize.mjs';

const MAX_PAGES = 5;

function decodeBasicEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function absoluteCivisUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  let url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `https://arstechnica.com${pathOrUrl}`;
  url = decodeBasicEntities(url).split('#')[0].split('?')[0];
  url = url.replace(/\/unread\/?$/i, '/');
  if (!url.endsWith('/')) url += '/';
  return url;
}

function extractThreadInfo(articleHtml) {
  const threadId = articleHtml.match(/data-thread-id="(\d+)"/)?.[1] || null;
  const dataUrl = articleHtml.match(/data-url="(https:\/\/arstechnica\.com\/civis\/threads\/[^"]+)"/)?.[1];
  const href = articleHtml.match(/href="(https:\/\/arstechnica\.com\/civis\/threads\/[^"]+)"/)?.[1]
    || articleHtml.match(/href="(\/civis\/threads\/[^"]+)"/)?.[1];
  const countMatch = articleHtml.match(/(\d[\d,]*)\s*comments?/i);
  const commentCount = countMatch ? Number(countMatch[1].replace(/,/g, '')) : null;
  const threadUrl = absoluteCivisUrl(decodeBasicEntities(dataUrl || href || ''));
  return { threadId, threadUrl, commentCount };
}

function stripTags(html) {
  return cleanText(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
  );
}

function parsePostsFromThreadHtml(threadHtml, threadUrl) {
  const posts = [];
  const articleRe = /<article\b([^>]*)>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articleRe.exec(threadHtml))) {
    const attrs = match[1] || '';
    const bodyHtml = match[2] || '';
    if (!/\bjs-post\b/.test(attrs) && !/\bmessage--post\b/.test(attrs) && !/\bmessage--article\b/.test(attrs)) {
      continue;
    }

    const author = attrs.match(/data-author="([^"]+)"/)?.[1] || 'Ars Reader';
    const contentId = attrs.match(/data-content="([^"]+)"/)?.[1] || '';
    const externalId = (contentId.replace(/^post-/, '') || bodyHtml.match(/id="js-post-(\d+)"/)?.[1] || '').trim();
    if (!externalId) continue;

    const isArticleStub = /\bmessage--article\b/.test(attrs) || author === 'JournalBot';
    const time = bodyHtml.match(/<time[^>]*datetime="([^"]+)"/)?.[1]
      || bodyHtml.match(/data-time="(\d+)"/)?.[1];
    let createdAt = null;
    if (time) {
      createdAt = /^\d+$/.test(time) ? new Date(Number(time) * 1000) : new Date(time);
    }

    const wrapper = bodyHtml.match(/class="bbWrapper">([\s\S]*?)<\/div>/)?.[1] || '';
    const body = stripTags(wrapper);
    if (!body) continue;

    // Skip the OpenForum article stub that only mirrors the story lede.
    if (isArticleStub && /see full article/i.test(body) && body.length < 400) {
      continue;
    }

    const score = Number(
      bodyHtml.match(/js-voteCount--total"[^>]*data-score="(-?\d+)"/)?.[1]
      || bodyHtml.match(/contentVote-score--total[^>]*data-score="(-?\d+)"/)?.[1]
      || 0
    );

    const permalinkPath = bodyHtml.match(/href="(\/civis\/(?:threads|posts)\/[^"]*post-\d+[^"]*)"/)?.[1]
      || `/civis/posts/${externalId}`;

    posts.push(
      makeComment({
        externalId,
        parentExternalId: null,
        author,
        body,
        createdAt,
        score,
        replyCount: 0,
        depth: 0,
        permalink: absoluteCivisUrl(permalinkPath) || `${threadUrl}#post-${externalId}`,
        metadata: { isArticleStub }
      })
    );
  }
  return posts;
}

async function fetchThreadPage(threadUrl, page) {
  const url = page <= 1 ? threadUrl.replace(/\/?$/, '/') : `${threadUrl.replace(/\/?$/, '/') }page-${page}`;
  const result = await fetchText(url);
  if (!result.ok) {
    return { ok: false, status: result.status, message: `Ars forum HTTP ${result.status}` };
  }
  return { ok: true, html: result.text, url: result.url };
}

/**
 * Harvest Ars Technica OpenForum (XenForo) comments linked from each story.
 */
export async function harvestArsComments(articleUrl) {
  const article = await fetchText(articleUrl);
  if (!article.ok) {
    return emptyResult({
      platform: 'ars',
      status: 'error',
      message: `Could not load Ars article (HTTP ${article.status})`
    });
  }

  const info = extractThreadInfo(article.text);
  if (!info.threadUrl) {
    return emptyResult({
      platform: 'ars',
      status: 'empty',
      message: 'No OpenForum thread linked from this Ars story',
      sourceThreadUrl: articleUrl
    });
  }

  const all = [];
  let pagesFetched = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const threadPage = await fetchThreadPage(info.threadUrl, page);
    if (!threadPage.ok) {
      if (page === 1) {
        return emptyResult({
          platform: 'ars',
          status: 'error',
          message: threadPage.message,
          sourceThreadUrl: info.threadUrl
        });
      }
      break;
    }
    pagesFetched += 1;
    const posts = parsePostsFromThreadHtml(threadPage.html, info.threadUrl);
    if (!posts.length) break;
    const before = all.length;
    const seen = new Set(all.map((c) => c.externalId));
    for (const post of posts) {
      if (seen.has(post.externalId)) continue;
      seen.add(post.externalId);
      all.push(post);
    }
    if (all.length === before) break;

    const nextPage = page + 1;
    const hasNext =
      new RegExp(`page-${nextPage}(?:["'/]|\\b)`).test(threadPage.html)
      || new RegExp(`>\\s*${nextPage}\\s*<`).test(threadPage.html);
    if (posts.length < 15) break;
    if (!hasNext) break;
  }

  if (!all.length) {
    return emptyResult({
      platform: 'ars',
      status: 'empty',
      message: 'OpenForum thread has no readable posts yet',
      sourceThreadUrl: info.threadUrl
    });
  }

  const summary = summarizeTree(all);
  return {
    platform: 'ars',
    status: 'ok',
    message: null,
    sourceThreadUrl: info.threadUrl,
    commentCount: info.commentCount ?? summary.commentCount,
    parentCount: summary.parentCount,
    replyCount: Math.max(0, (info.commentCount ?? summary.commentCount) - 1),
    comments: all,
    meta: {
      threadId: info.threadId,
      pagesFetched,
      listedCommentCount: info.commentCount
    }
  };
}
