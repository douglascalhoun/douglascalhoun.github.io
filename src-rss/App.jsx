import React, { useEffect, useRef, useState } from 'react';
import ArticleList from './components/ArticleList';
import * as api from './services/api';
import {
  getStoryCounts,
  getUnreadStories,
  markManyRead,
  markManyUnread,
  markRead,
  markUnread,
  mergeStoriesIntoCache
} from './services/cache';
import { startAmbientPalette } from './services/ambient';

const UNDO_MS = 8000;

function App() {
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlNote, setCrawlNote] = useState('');
  const [error, setError] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => {
    refreshFromServer();
  }, []);

  useEffect(() => {
    const stop = startAmbientPalette({ periodMs: 96000 });
    return stop;
  }, []);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  function syncFromCache() {
    setStories(getUnreadStories());
    setCounts(getStoryCounts());
  }

  function offerUndo({ ids, label }) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ ids, label });
    undoTimer.current = setTimeout(() => {
      setUndo(null);
      undoTimer.current = null;
    }, UNDO_MS);
  }

  function handleUndo() {
    if (!undo?.ids?.length) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    if (undo.ids.length === 1) markUnread(undo.ids[0]);
    else markManyUnread(undo.ids);
    setUndo(null);
    syncFromCache();
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
    const story = stories.find((s) => s.id === id);
    markRead(id);
    syncFromCache();
    offerUndo({
      ids: [id],
      label: story?.title ? `Marked read: ${story.title}` : 'Marked read'
    });
  }

  function handleMarkAllRead() {
    const ids = stories.map((s) => s.id);
    if (!ids.length) return;
    markManyRead(ids);
    syncFromCache();
    offerUndo({
      ids,
      label: `Cleared ${ids.length} ${ids.length === 1 ? 'story' : 'stories'}`
    });
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

      {undo && (
        <div className="undo-bar" role="status" aria-live="polite">
          <p className="undo-label">{undo.label}</p>
          <button type="button" className="btn undo-btn" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
