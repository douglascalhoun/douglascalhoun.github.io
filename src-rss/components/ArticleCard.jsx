import React from 'react';
import ArticleComments from './ArticleComments';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function ArticleCard({ article, onMarkRead }) {
  return (
    <article className="story">
      <button
        type="button"
        className="btn-dismiss"
        onClick={() => onMarkRead(article.id)}
        aria-label="Mark as read"
        title="Mark as read"
      >
        ×
      </button>
      <div className="story-body">
        <div className="story-meta">
          <span className="story-source">{article.feed_name}</span>
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
        <ArticleComments article={article} />
      </div>
    </article>
  );
}

export default ArticleCard;
