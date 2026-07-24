import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({
  articles,
  onMarkRead,
  onOpen,
  focusedId,
  focusedRef,
}) {
  if (!articles.length) {
    return (
      <div className="empty">
        <p className="empty-title">You’re caught up</p>
        <p>New stories usually arrive within about 30 minutes.</p>
        <p className="empty-hint">Press <kbd>?</kbd> for keyboard shortcuts</p>
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
          onOpen={onOpen}
          focused={article.id === focusedId}
          cardRef={article.id === focusedId ? focusedRef : undefined}
        />
      ))}
    </div>
  );
}

export default ArticleList;
