import React, { useEffect, useRef, useState } from 'react';
import ArticleList from './components/ArticleList';
import SourcesNav, { SourcesIndexPage } from './components/SourcesNav';
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
import { usePathname, navigate } from './services/routing';
import {
  getSourceBySlug,
  parseAppPath,
  SOURCES
} from './services/sources';

const UNDO_MS = 8000;
const LIVE_ORIGIN = 'https://rss-news-aggregator.netlify.app';

function FeedView({
  title,
  tagline,
  feedName = null,
  source = null,
  showSourceNav = true,
  autoOpenComments = false
}) {
  const [stories, setStories] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlNote, setCrawlNote] = useState('');
  const [error, setError] = useState(null);
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);

  function syncFromCache() {
    setStories(getUnreadStories({ feedName }));
    setCounts(getStoryCounts({ feedName }));
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
      const data = await api.fetchArticles({
        limit: feedName ? 100 : 150,
        offset: 0,
        feed: feedName || undefined
      });
      mergeStoriesIntoCache(data.articles || []);
      // Also pull a broader set on source pages so cache stays useful for home
      if (feedName) {
        const all = await api.fetchArticles({ limit: 150, offset: 0 });
        mergeStoriesIntoCache(all.articles || []);
      }
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

  useEffect(() => {
    refreshFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedName]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const progress = counts.total
    ? Math.round((counts.read / counts.total) * 100)
    : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            {feedName && (
              <button type="button" className="back-link" onClick={() => navigate('/')}>
                ← All sources
              </button>
            )}
            <h1>{title}</h1>
            <p className="tagline">{tagline}</p>
            {source?.comments && (
              <p className="source-comments-note">
                Public comments are harvested for this source — expand under each story, or they open automatically here.
              </p>
            )}
            {source && !source.comments && (
              <p className="source-comments-note muted">
                This source does not expose a public comments feed.
              </p>
            )}
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
        {showSourceNav && (
          <SourcesNav activeSlug={source?.slug || null} compact={!feedName} />
        )}

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
          <ArticleList
            articles={stories}
            onMarkRead={handleMarkRead}
            showSourceLink={!feedName}
            autoOpenComments={autoOpenComments}
            emptyMessage={
              feedName
                ? `No unread stories from ${feedName}.`
                : 'No unread stories. Crawl sources to check for new items.'
            }
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
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="app">
      <main className="main">
        <div className="empty">
          <p>Page not found.</p>
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Back to Worldwire
          </button>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [pathname] = usePathname();
  const route = parseAppPath(pathname);

  useEffect(() => {
    const stop = startAmbientPalette({ periodMs: 96000 });
    return stop;
  }, []);

  useEffect(() => {
    if (route.view === 'source') {
      const source = getSourceBySlug(route.slug);
      document.title = source ? `${source.name} · Worldwire` : 'Worldwire';
    } else if (route.view === 'sources') {
      document.title = 'Sources · Worldwire';
    } else {
      document.title = 'Worldwire';
    }
  }, [route]);

  if (route.view === 'sources') {
    return <SourcesIndexPage />;
  }

  if (route.view === 'source') {
    const source = getSourceBySlug(route.slug);
    if (!source) return <NotFoundPage />;
    return (
      <FeedView
        title={source.name}
        tagline={`Recent unread stories from ${source.name}`}
        feedName={source.name}
        source={source}
        autoOpenComments={Boolean(source.comments)}
      />
    );
  }

  if (route.view === 'notfound') {
    return <NotFoundPage />;
  }

  return (
    <FeedView
      title="Worldwire"
      tagline="Unread stories from serious newsrooms"
      showSourceNav
      autoOpenComments={false}
    />
  );
}

// Exported for docs / link lists
export const SOURCE_LINKS = SOURCES.map((s) => ({
  name: s.name,
  path: `/source/${s.slug}`,
  url: `${LIVE_ORIGIN}/source/${s.slug}`,
  comments: s.comments
}));

export const MAIN_LINK = LIVE_ORIGIN;

export default App;
