import React from 'react';

function FeedList({ feeds, onClose }) {
  const feedsByCategory = feeds.reduce((acc, feed) => {
    if (!acc[feed.category]) {
      acc[feed.category] = [];
    }
    acc[feed.category].push(feed);
    return acc;
  }, {});

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>📡 RSS Feeds</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      
      <div className="panel-content">
        {Object.entries(feedsByCategory).map(([category, categoryFeeds]) => (
          <section key={category} className="settings-section">
            <h3>{category.toUpperCase()}</h3>
            <div className="feed-list">
              {categoryFeeds.map(feed => (
                <div key={feed.id} className="feed-item">
                  <div className="feed-info">
                    <div className="feed-name">
                      {feed.name}
                      {!feed.active && <span className="badge badge-inactive">Inactive</span>}
                    </div>
                    <div className="feed-meta">
                      {feed.country && <span className="feed-country">📍 {feed.country}</span>}
                      <span className="feed-count">{feed.article_count || 0} articles</span>
                      {feed.last_fetched_at && (
                        <span className="feed-last-fetch">
                          Last updated: {new Date(feed.last_fetched_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="panel-footer">
        <button onClick={onClose} className="btn btn-primary">Close</button>
      </div>
    </div>
  );
}

export default FeedList;
