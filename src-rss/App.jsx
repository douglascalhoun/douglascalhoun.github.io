import React, { useEffect, useState } from 'react';
import ArticleList from './components/ArticleList';
import * as api from './services/api';
import {
  getStoryCounts,
  getUnreadStories,
  markManyRead,
  markRead,
  mergeStoriesIntoCache
} from './services/cache';
import { startAmbientPalette } from './services/ambient';

function App() {
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlNote, setCrawlNote] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshFromServer();
  }, []);

  useEffect(() => {
    const stop = startAmbientPalette({ periodMs: 96000 });
    return stop;
  }, []);

  function syncFromCache() {
    setStories(getUnreadStories());
    setCounts(getStoryCounts());
  }

  async function refreshFromServer() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchArticles({ limit: 150, offset: 0 });
      mergeStoriesIntoCache(data.articles || []);
      syncFromCache();
    } catch (err) {
      syncFromCache();
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
      setCrawlNote(
        `Last crawl: ${result.successfulFeeds || 0}/${result.totalFeeds || 0} sources`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCrawling(false);
    }
  }

  function handleMarkRead(id) {
    markRead(id);
    syncFromCache();
  }

  function handleMarkAllRead() {
    markManyRead(stories.map((s) => s.id));
    syncFromCache();
  }

  const progress = counts.total
    ? Math.round((counts.read / counts.total) * 100)
    : 0;

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
              Clear all
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="counts" aria-live="polite">
          <div className="counts-row">
            <span className="count-pill count-unread">
              <strong>{counts.unread}</strong> to read
            </span>
            <span className="count-pill count-read">
              <strong>{counts.read}</strong> read
            </span>
            <span className="count-total">{counts.total} cached</span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`${progress}% read`}
          >
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="status-row">
          <span>{crawlNote}</span>
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
