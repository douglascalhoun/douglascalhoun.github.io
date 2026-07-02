import React from 'react';
import ArticleCard from './ArticleCard';

function ArticleList({ articles }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="empty-state">
        <p>No articles found. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

export default ArticleList;
