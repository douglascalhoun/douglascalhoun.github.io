import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({
  articles,
  onMarkRead,
  showSourceLink = true,
  autoOpenComments = false,
  autoOpenLimit = 3,
  emptyMessage = 'No unread stories. Crawl sources to check for new items.'
}) {
  if (!articles.length) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <div className="story-list">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          onMarkRead={onMarkRead}
          showSourceLink={showSourceLink}
          autoOpenComments={autoOpenComments && index < autoOpenLimit}
        />
      ))}
    </div>
  );
}

export default ArticleList;
