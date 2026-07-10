import React from 'react';

function ArticleCard({ article, onToggleRead, onToggleFavorite }) {
  const formattedDate = article.pub_date
    ? new Date(article.pub_date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const isRead = !!article.is_read;
  const isFavorite = !!article.is_favorite;

  function handleOpen() {
    if (!isRead && onToggleRead) {
      onToggleRead(article.id, true);
    }
  }

  return (
    <article className={`article-card ${isRead ? 'is-read' : 'is-unread'}`}>
      {article.image_url && (
        <div className="article-image">
          <img src={article.image_url} alt="" loading="lazy" />
        </div>
      )}
      <div className="article-content">
        <div className="article-meta">
          <span className="article-source">{article.feed_name}</span>
          <span className="article-category">{article.feed_category}</span>
          {article.feed_country && (
            <span className="article-country">{article.feed_country}</span>
          )}
          <span className="article-date">{formattedDate}</span>
          {!isRead && <span className="article-unread-dot" title="Unread">●</span>}
          {typeof article.relevance_score === 'number' && article.relevance_score >= 28 && (
            <span className="article-impact" title={`Impact score ${article.relevance_score}`}>Impact</span>
          )}
          {Array.isArray(article.topics) && article.topics.slice(0, 2).map((topic) => (
            <span key={topic} className="article-topic">{topic}</span>
          ))}
        </div>
        <h2 className="article-title">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpen}
          >
            {article.title}
          </a>
        </h2>
        {article.description && (
          <p className="article-description">{article.description}</p>
        )}
        <div className="article-actions">
          {article.author && (
            <div className="article-author">By {article.author}</div>
          )}
          <div className="article-action-buttons">
            <button
              className={`btn btn-tiny ${isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite?.(article.id, !isFavorite)}
              title={isFavorite ? 'Remove favorite' : 'Save favorite'}
            >
              {isFavorite ? '★ Saved' : '☆ Save'}
            </button>
            <button
              className="btn btn-tiny"
              onClick={() => onToggleRead?.(article.id, !isRead)}
              title={isRead ? 'Mark unread' : 'Mark read'}
            >
              {isRead ? 'Mark unread' : 'Mark read'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
