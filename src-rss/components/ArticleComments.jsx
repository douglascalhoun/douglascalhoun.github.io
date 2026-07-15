import React, { useState } from 'react';
import * as api from '../services/api';

function formatCommentDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function CommentItem({ comment, depth = 0 }) {
  return (
    <li className={`comment-item depth-${Math.min(depth, 4)}`}>
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
              depth={depth + 1}
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
  if (data.status === 'unsupported') return 'Not available';
  if (data.status === 'closed') return 'Comments closed';
  if (data.status === 'paywalled') return 'Subscriber only';
  if (data.status === 'error') return 'Couldn’t load';
  return 'Comments';
}

function ArticleComments({ article }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(() => {
    if (article.comment_status) {
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

  async function load({ refresh = false } = {}) {
    try {
      setLoading(true);
      setError(null);
      const result = await api.fetchArticleComments(article.id, { refresh });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && (!data || data.comments == null)) {
      await load();
    }
  }

  const previewCount =
    data?.commentCount ??
    article.comment_count ??
    null;

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
              </div>

              {data.message && data.status !== 'ok' && (
                <p className="comments-note">{data.message}</p>
              )}

              {data.status === 'ok' && Array.isArray(data.comments) && data.comments.length > 0 && (
                <ul className="comment-list">
                  {data.comments.map((comment) => (
                    <CommentItem
                      key={comment.externalId || comment.id}
                      comment={comment}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ArticleComments;
