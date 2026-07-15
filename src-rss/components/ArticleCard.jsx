import React from 'react';
import ArticleComments from './ArticleComments';
import { getSourceByName, sourceSupportsComments } from '../services/sources';
import { navigate } from '../services/routing';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function ArticleCard({
  article,
  onMarkRead,
  showSourceLink = true,
  autoOpenComments = false
}) {
  const source = getSourceByName(article.feed_name);
  const showComments = sourceSupportsComments(source);

  return (
    <article className="story">
      <button
        type="button"
        className="btn-dismiss"
        onClick={() => onMarkRead(article.id)}
        aria-label="Mark as read"
        title="Mark as read and hide"
      >
        ×
      </button>
      <div className="story-body">
        <div className="story-meta">
          {showSourceLink && source ? (
            <button
              type="button"
              className="story-source linkish"
              onClick={() => navigate(`/source/${source.slug}`)}
            >
              {article.feed_name}
            </button>
          ) : (
            <span className="story-source">{article.feed_name}</span>
          )}
          <span className="story-date">{formatDate(article.pub_date)}</span>
        </div>
        <h2 className="story-title">
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h2>
        {article.description && (
          <p className="story-blurb">{article.description}</p>
        )}
        {showComments && (
          <ArticleComments
            article={article}
            autoOpen={autoOpenComments}
            defaultOpen={false}
          />
        )}
      </div>
    </article>
  );
}

export default ArticleCard;
