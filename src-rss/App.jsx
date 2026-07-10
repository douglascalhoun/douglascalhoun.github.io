import React, { useEffect, useState } from 'react';
import ArticleList from './components/ArticleList';
import * as api from './services/api';
import {
  getUnreadStories,
  markManyRead,
  markRead,
  mergeStoriesIntoCache
} from './services/cache';

function App() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshFromServer();
  }, []);

  function showUnreadFromCache() {
    setStories(getUnreadStories());
  }

  async function refreshFromServer() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchArticles({ limit: 150, offset: 0 });
      mergeStoriesIntoCache(data.articles || []);
      showUnreadFromCache();
      setStatus(`${getUnreadStories().length} unread`);
    } catch (err) {
      // Fall back to whatever is already cached locally
      showUnreadFromCache();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCrawl() {
    try {
      setCrawling(true);
      setError(null);
      const result = await api.triggerFetch();
      await refreshFromServer();
      setStatus(
        `Crawled ${result.successfulFeeds || 0}/${result.totalFeeds || 0} sources · ${getUnreadStories().length} unread`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCrawling(false);
    }
  }

  function handleMarkRead(id) {
    markRead(id);
    setStories((prev) => prev.filter((s) => s.id !== id));
    setStatus(`${getUnreadStories().length} unread`);
  }

  function handleMarkAllRead() {
    markManyRead(stories.map((s) => s.id));
    setStories([]);
    setStatus('0 unread');
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>Worldwire</h1>
            <p className="tagline">Unread stories from serious newsrooms</p>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={refreshFromServer} disabled={loading || crawling}>
              Refresh
            </button>
            <button type="button" className="btn" onClick={handleCrawl} disabled={loading || crawling}>
              {crawling ? 'Crawling…' : 'Crawl sources'}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={handleMarkAllRead}
              disabled={!stories.length}
            >
              Mark all read
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="status-row">
          <span>{status}</span>
          {error && <span className="error">{error}</span>}
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <ArticleList articles={stories} onMarkRead={handleMarkRead} />
        )}
      </main>
    </div>
  );
}

export default App;
