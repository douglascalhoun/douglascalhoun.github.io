import React from 'react';

function ArticleCard({ article }) {
  const formattedDate = article.pub_date 
    ? new Date(article.pub_date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <article className="article-card">
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
        </div>
        <h2 className="article-title">
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h2>
        {article.description && (
          <p className="article-description">{article.description}</p>
        )}
        {article.author && (
          <div className="article-author">By {article.author}</div>
        )}
      </div>
    </article>
  );
}

export default ArticleCard;
