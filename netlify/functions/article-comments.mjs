// On-demand comment harvest + cache for a single Worldwire article
import { getDatabase } from './lib/db.mjs';
import { harvestCommentsForUrl, COMMENT_PLATFORM_NOTES } from './lib/comments/index.mjs';
import {
  getArticleForComments,
  getCommentSnapshot,
  getStoredComments,
  isSnapshotFresh,
  saveHarvest,
  serializeSnapshot
} from './lib/comments/store.mjs';
import { ensureCommentsSchema } from './lib/comments/schema.mjs';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS
    });
  }

  try {
    const url = new URL(req.url);
    const articleId = url.searchParams.get('id') || url.searchParams.get('articleId');
    const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('force') === '1';
    const flat = url.searchParams.get('flat') === '1';

    if (!articleId) {
      return new Response(
        JSON.stringify({
          error: 'Missing id',
          platforms: COMMENT_PLATFORM_NOTES
        }),
        { status: 400, headers: CORS }
      );
    }

    const db = await getDatabase();
    await ensureCommentsSchema(db);

    const article = await getArticleForComments(db, articleId);
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: CORS
      });
    }

    const existing = await getCommentSnapshot(db, articleId);
    if (isSnapshotFresh(existing, { force })) {
      const comments = await getStoredComments(db, articleId);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          article: {
            id: article.id,
            title: article.title,
            link: article.link,
            feedName: article.feed_name
          },
          ...serializeSnapshot(existing, comments, { nested: !flat })
        }),
        { status: 200, headers: CORS }
      );
    }

    const harvest = await harvestCommentsForUrl(article.link);
    await saveHarvest(db, articleId, harvest);
    const snapshot = await getCommentSnapshot(db, articleId);
    const comments = await getStoredComments(db, articleId);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        article: {
          id: article.id,
          title: article.title,
          link: article.link,
          feedName: article.feed_name
        },
        ...serializeSnapshot(snapshot, comments, { nested: !flat })
      }),
      { status: 200, headers: CORS }
    );
  } catch (error) {
    console.error('article-comments error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: CORS }
    );
  }
};
