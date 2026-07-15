import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import {
  isCommentChainRead,
  markCommentChainRead,
  markCommentChainUnread
} from '../services/cache';

function formatCommentDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function CommentItem({
  comment,
  articleId,
  depth = 0,
  hideReadChains = true,
  onHideChain,
  revision = 0
}) {
  const externalId = comment.externalId || comment.id;
  const isRoot = depth === 0;
  const hidden = isRoot && hideReadChains && isCommentChainRead(articleId, externalId);

  if (hidden) return null;

  return (
    <li className={`comment-item depth-${Math.min(depth, 4)}`} data-rev={revision}>
      <div className="comment-head">
        <span className="comment-author">{comment.author}</span>
        {comment.authorLocation && (
          <span className="comment-loc">{comment.authorLocation}</span>
        )}
        {comment.createdAt && (
          <span className="comment-date">{formatCommentDate(comment.createdAt)}</span>
        )}
        {typeof comment.score === 'number' && comment.score > 0 && (
          <span className="comment-score">+{comment.score}</span>
        )}
        {comment.isEditorsPick && <span className="comment-pick">Editors’ pick</span>}
        {isRoot && (
          <button
            type="button"
            className="comment-hide"
            onClick={() => onHideChain?.(externalId)}
            title="Mark this comment chain as read and hide it"
          >
            Mark read
          </button>
        )}
      </div>
      <p className="comment-body">{comment.body}</p>
      {comment.permalink && (
        <a
          className="comment-permalink"
          href={comment.permalink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Permalink
        </a>
      )}
      {!!comment.replies?.length && (
        <ul className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.externalId || reply.id}
              comment={reply}
              articleId={articleId}
              depth={depth + 1}
              hideReadChains={hideReadChains}
              onHideChain={onHideChain}
              revision={revision}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function statusLabel(data) {
  if (!data) return '';
  if (data.status === 'ok') {
    const n = data.commentCount ?? data.comments?.length ?? 0;
    return `${n} comment${n === 1 ? '' : 's'}`;
  }
  if (data.status === 'empty') return 'No comments yet';
  if (data.status === 'closed') return 'Comments closed';
  if (data.status === 'error') return 'Couldn’t load';
  return 'Comments';
}

function ArticleComments({
  article,
  autoOpen = false,
  defaultOpen = false
}) {
  const shouldStartOpen = Boolean(autoOpen || defaultOpen);
  const [open, setOpen] = useState(shouldStartOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [data, setData] = useState(() => {
    if (article.comment_status && article.comment_status !== 'unsupported') {
      return {
        status: article.comment_status,
        platform: article.comment_platform,
        commentCount: article.comment_count,
        sourceThreadUrl: article.comment_thread_url,
        comments: null
      };
    }
    return null;
  });

  // Never show comment UI once we know this story's publisher has no harvest.
  if (data?.status === 'unsupported') {
    return null;
  }

  async function load({ refresh = false } = {}) {
    try {
      setLoading(true);
      setError(null);
      const result = await api.fetchArticleComments(article.id, { refresh });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!shouldStartOpen) return undefined;
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        setOpen(true);
        await load();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, shouldStartOpen]);

  useEffect(() => {
    if (!data?.comments) {
      setHiddenCount(0);
      return;
    }
    const roots = data.comments || [];
    setHiddenCount(
      roots.filter((c) => isCommentChainRead(article.id, c.externalId || c.id)).length
    );
  }, [data, article.id, revision]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && (!data || data.comments == null)) {
      await load();
    }
  }

  function handleHideChain(externalId) {
    markCommentChainRead(article.id, externalId);
    setRevision((n) => n + 1);
  }

  function handleRestoreHidden() {
    const roots = data?.comments || [];
    for (const c of roots) {
      markCommentChainUnread(article.id, c.externalId || c.id);
    }
    setRevision((n) => n + 1);
  }

  const previewCount =
    data?.commentCount ??
    article.comment_count ??
    null;

  const visibleRoots = useMemo(() => {
    if (!Array.isArray(data?.comments)) return [];
    return data.comments.filter(
      (c) => !isCommentChainRead(article.id, c.externalId || c.id)
    );
  }, [data, article.id, revision]);

  return (
    <div className="story-comments">
      <button
        type="button"
        className="comments-toggle"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span className="comments-caret" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span>
          Comments
          {previewCount != null && previewCount > 0 ? ` · ${previewCount}` : ''}
        </span>
        {data?.platform && data.platform !== 'unknown' && (
          <span className="comments-platform">{data.platform}</span>
        )}
      </button>

      {open && (
        <div className="comments-panel">
          {loading && <p className="comments-note">Loading comments…</p>}
          {error && <p className="comments-error">{error}</p>}

          {!loading && data && (
            <>
              <div className="comments-meta">
                <span>{statusLabel(data)}</span>
                {data.sourceThreadUrl && (
                  <a
                    href={data.sourceThreadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on source
                  </a>
                )}
                <button
                  type="button"
                  className="comments-refresh"
                  onClick={() => load({ refresh: true })}
                  disabled={loading}
                >
                  Refresh
                </button>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="comments-refresh"
                    onClick={handleRestoreHidden}
                  >
                    Show {hiddenCount} hidden
                  </button>
                )}
              </div>

              {data.message && data.status === 'empty' && (
                <p className="comments-note">{data.message}</p>
              )}
              {data.message && data.status === 'error' && (
                <p className="comments-error">{data.message}</p>
              )}

              {data.status === 'ok' && visibleRoots.length > 0 && (
                <ul className="comment-list">
                  {visibleRoots.map((comment) => (
                    <CommentItem
                      key={comment.externalId || comment.id}
                      comment={comment}
                      articleId={article.id}
                      onHideChain={handleHideChain}
                      revision={revision}
                    />
                  ))}
                </ul>
              )}

              {data.status === 'ok'
                && Array.isArray(data.comments)
                && data.comments.length > 0
                && visibleRoots.length === 0 && (
                <p className="comments-note">
                  All comment chains on this story are marked read.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ArticleComments;
