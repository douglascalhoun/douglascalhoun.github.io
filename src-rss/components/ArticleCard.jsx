import React from 'react';
import { formatRelativeTime } from '../services/time';

function importanceLevel(score) {
  const n = Number(score) || 0;
  if (n >= 45) return 3;
  if (n >= 32) return 2;
  if (n >= 24) return 1;
  return 0;
}

function ArticleCard({
  article,
  onMarkRead,
  onOpen,
  focused = false,
  cardRef,
}) {
  const level = importanceLevel(article.relevance_score);

  return (
    <article
      className={`story${focused ? ' is-focused' : ''}${level ? ` heat-${level}` : ''}`}
      ref={cardRef}
      data-id={article.id}
    >
      <button
        type="button"
        className="btn-dismiss"
        onClick={() => onMarkRead(article.id)}
        aria-label="Mark as read"
        title="Mark as read (x)"
      >
        ×
      </button>
      <div className="story-body">
        <div className="story-meta">
          <span className="story-source">{article.feed_name}</span>
          <span className="story-date">{formatRelativeTime(article.pub_date)}</span>
          {level > 0 && (
            <span
              className="story-heat"
              aria-label={`Importance ${level} of 3`}
              title="Editorial weight"
            >
              {'●'.repeat(level)}
            </span>
          )}
        </div>
        <h2 className="story-title">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen?.(article.id)}
          >
            {article.title}
          </a>
        </h2>
        {article.description && (
          <p className="story-blurb">{article.description}</p>
        )}
      </div>
    </article>
  );
}

export default ArticleCard;
