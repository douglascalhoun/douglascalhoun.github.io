import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({ articles, onMarkRead }) {
  if (!articles.length) {
    return (
      <div className="empty">
        No unread stories. Crawl sources to check for new items.
      </div>
    );
  }

  return (
    <div className="story-list">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}

export default ArticleList;
