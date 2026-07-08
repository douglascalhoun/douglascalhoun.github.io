import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({ articles, onToggleRead, onToggleFavorite, hasMore, onLoadMore, loadingMore }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="empty-state">
        <p>No articles found. Try another search or filter.</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map(article => (
        <ArticleCard
          key={article.id}
          article={article}
          onToggleRead={onToggleRead}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
      {hasMore && (
        <div className="load-more">
          <button
            className="btn btn-primary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ArticleList;
