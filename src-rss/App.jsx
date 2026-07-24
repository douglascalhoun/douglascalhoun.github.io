import React, { useEffect, useRef, useState } from 'react';
import ArticleList from './components/ArticleList';
import ShortcutsHelp from './components/ShortcutsHelp';
import * as api from './services/api';
import { buildWireBrief } from './services/brief';
import {
  getCacheUpdatedAt,
  getStoryCounts,
  getUnreadStories,
  markManyRead,
  markManyUnread,
  markRead,
  markUnread,
  mergeStoriesIntoCache
} from './services/cache';
import { startAmbientPalette } from './services/ambient';
import { formatClock, formatRelativeTime } from './services/time';

const UNDO_MS = 8000;
const AUTO_REFRESH_MS = 10 * 60 * 1000;

function App() {
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [error, setError] = useState(null);
  const [undo, setUndo] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const undoTimer = useRef(null);
  const focusedRef = useRef(null);
  const storiesRef = useRef([]);
  const undoRef = useRef(null);

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

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

  // Keep focus valid as the list changes
  useEffect(() => {
    if (!stories.length) {
      setFocusedId(null);
      return;
    }
    if (!focusedId || !stories.some((s) => s.id === focusedId)) {
      setFocusedId(stories[0].id);
    }
  }, [stories, focusedId]);

  useEffect(() => {
    if (focusedRef.current) {
      focusedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedId]);

  // Auto-refresh while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshFromServer({ quiet: true });
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  function syncFromCache() {
    const unread = getUnreadStories();
    setStories(unread);
    setCounts(getStoryCounts());
    const updatedAt = getCacheUpdatedAt();
    if (updatedAt) {
      setStatusNote(`Updated ${formatRelativeTime(updatedAt)}`);
    }
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
    const current = undoRef.current;
    if (!current?.ids?.length) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    if (current.ids.length === 1) markUnread(current.ids[0]);
    else markManyUnread(current.ids);
    setUndo(null);
    syncFromCache();
  }

  async function refreshFromServer({ quiet = false } = {}) {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const data = await api.fetchArticles({ limit: 200, offset: 0 });
      mergeStoriesIntoCache(data.articles || []);
      syncFromCache();
    } catch (err) {
      syncFromCache();
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function handleCrawl() {
    try {
      setCrawling(true);
      setError(null);
      const result = await api.triggerFetch();
      await refreshFromServer();
      setStatusNote(
        `Crawled ${result.successfulFeeds || 0}/${result.totalFeeds || 0} · ${formatClock(new Date())}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCrawling(false);
    }
  }

  function handleMarkRead(id) {
    const list = storiesRef.current;
    const idx = list.findIndex((s) => s.id === id);
    const story = list[idx];
    markRead(id);
    syncFromCache();
    offerUndo({
      ids: [id],
      label: story?.title ? `Marked read: ${story.title}` : 'Marked read',
    });
    // Advance focus to the next remaining story
    const next = list[idx + 1] || list[idx - 1];
    if (next && next.id !== id) setFocusedId(next.id);
  }

  function handleOpen(id) {
    // Opening a story counts as reading it
    handleMarkRead(id);
  }

  function handleMarkAllRead() {
    const ids = storiesRef.current.map((s) => s.id);
    if (!ids.length) return;
    markManyRead(ids);
    syncFromCache();
    offerUndo({
      ids,
      label: `Cleared ${ids.length} ${ids.length === 1 ? 'story' : 'stories'}`,
    });
  }

  function moveFocus(delta) {
    const list = storiesRef.current;
    if (!list.length) return;
    const idx = Math.max(0, list.findIndex((s) => s.id === focusedId));
    const next = list[Math.min(list.length - 1, Math.max(0, idx + delta))];
    if (next) setFocusedId(next.id);
  }

  function openFocused() {
    const story = storiesRef.current.find((s) => s.id === focusedId);
    if (!story?.link) return;
    window.open(story.link, '_blank', 'noopener,noreferrer');
    handleMarkRead(story.id);
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setHelpOpen(false);
        return;
      }
      if (helpOpen) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1);
      } else if (e.key === 'x' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (focusedId) handleMarkRead(focusedId);
      } else if (e.key === 'o' || e.key === 'Enter') {
        e.preventDefault();
        openFocused();
      } else if (e.key === 'u') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'r') {
        e.preventDefault();
        refreshFromServer();
      } else if (e.key === 'c') {
        e.preventDefault();
        handleCrawl();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedId, helpOpen]);

  const progress = counts.total
    ? Math.round((counts.read / counts.total) * 100)
    : 0;
  const brief = buildWireBrief(stories);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>Worldwire</h1>
            <p className="tagline">Unread stories from serious newsrooms</p>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => refreshFromServer()} disabled={loading || crawling}>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={handleCrawl}
              disabled={loading || crawling}
              title="Force a source crawl (also runs every 30 minutes)"
            >
              {crawling ? 'Crawling…' : 'Crawl'}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={handleMarkAllRead}
              disabled={!stories.length}
            >
              Clear all
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="wire-brief" aria-live="polite">
          <h2 className="brief-headline">{brief.headline}</h2>
          <p className="brief-detail">{brief.detail}</p>
        </section>

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
          <span>{statusNote}</span>
          {error && <span className="error">{error}</span>}
        </div>

        {loading ? (
          <div className="empty">Loading the wire…</div>
        ) : (
          <ArticleList
            articles={stories}
            onMarkRead={handleMarkRead}
            onOpen={handleOpen}
            focusedId={focusedId}
            focusedRef={focusedRef}
          />
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

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export default App;
