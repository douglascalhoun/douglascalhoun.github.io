import React, { useState, useEffect } from 'react';
import ArticleList from './components/ArticleList';
import SettingsPanel from './components/SettingsPanel';
import FeedList from './components/FeedList';
import NotificationToggle from './components/NotificationToggle';
import NotificationHistory from './components/NotificationHistory';
import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getUserId
} from './services/notifications';
import * as api from './services/api';
import { DEFAULT_EXCLUDED_KEYWORDS, CATEGORY_LABELS } from './editorialDefaults';

function App() {
  const [articles, setArticles] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [viewMode, setViewMode] = useState('all'); // all | unread | favorites
  const [pagination, setPagination] = useState({ hasMore: false, total: 0, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeeds, setShowFeeds] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [userId] = useState(() => getUserId());
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rssPreferences') || 'null') || {
        keywords: [],
        excludedKeywords: DEFAULT_EXCLUDED_KEYWORDS,
        categories: [],
        countries: [],
        maxNotificationsPerHour: 12
      };
    } catch {
      return {
        keywords: [],
        excludedKeywords: DEFAULT_EXCLUDED_KEYWORDS,
        categories: [],
        countries: [],
        maxNotificationsPerHour: 12
      };
    }
  });

  useEffect(() => {
    loadArticles(true);
    loadFeeds();
    checkNotificationStatus();
  }, [selectedCategory, activeSearch, viewMode]);

  async function loadArticles(reset = false) {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const offset = reset ? 0 : articles.length;
      const data = await api.fetchArticles({
        category: selectedCategory === 'all' ? null : selectedCategory,
        limit: 30,
        offset,
        q: activeSearch || null,
        favorites: viewMode === 'favorites',
        unread: viewMode === 'unread',
        userId
      });

      setArticles(prev => reset ? (data.articles || []) : [...prev, ...(data.articles || [])]);
      setPagination(data.pagination || { hasMore: false, total: 0, offset });
      setError(null);
    } catch (err) {
      setError('Failed to load articles: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadFeeds() {
    try {
      const data = await api.fetchFeeds();
      setFeeds(data.feeds || []);
      setCategories(['all', ...(data.categories || [])]);
    } catch (err) {
      console.error('Failed to load feeds:', err);
    }
  }

  function checkNotificationStatus() {
    if ('Notification' in window) {
      setNotificationsEnabled(
        Notification.permission === 'granted' && !!localStorage.getItem('pushSubscription')
      );
    }
  }

  async function handleNotificationToggle() {
    if (notificationsEnabled) {
      await unsubscribeFromNotifications();
      setNotificationsEnabled(false);
    } else {
      try {
        await subscribeToNotifications(preferences);
        setNotificationsEnabled(true);
      } catch (err) {
        alert('Failed to enable notifications: ' + err.message);
      }
    }
  }

  async function handlePreferencesUpdate(newPreferences) {
    setPreferences(newPreferences);
    localStorage.setItem('rssPreferences', JSON.stringify(newPreferences));

    if (notificationsEnabled) {
      try {
        await subscribeToNotifications(newPreferences);
      } catch (err) {
        console.error('Failed to update preferences:', err);
      }
    }
  }

  async function handleToggleRead(articleId, isRead) {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_read: isRead } : a));
    try {
      await api.updateArticleState(userId, articleId, { isRead });
      if (viewMode === 'unread' && isRead) {
        setArticles(prev => prev.filter(a => a.id !== articleId));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update read state');
    }
  }

  async function handleToggleFavorite(articleId, isFavorite) {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_favorite: isFavorite } : a));
    try {
      await api.updateArticleState(userId, articleId, { isFavorite });
      if (viewMode === 'favorites' && !isFavorite) {
        setArticles(prev => prev.filter(a => a.id !== articleId));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update favorite');
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  }

  function closePanels() {
    setShowSettings(false);
    setShowFeeds(false);
    setShowHistory(false);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="brand-block">
            <h1>Worldwire</h1>
            <p className="brand-tagline">High-impact tech first. Signal over noise.</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-icon"
              onClick={() => loadArticles(true)}
              title="Refresh"
            >
              ↻
            </button>
            <button
              className={`btn btn-icon ${showHistory ? 'active' : ''}`}
              onClick={() => {
                closePanels();
                setShowHistory(true);
              }}
              title="Notification history"
            >
              ⌛️
            </button>
            <button
              className={`btn btn-icon ${showFeeds ? 'active' : ''}`}
              onClick={() => {
                closePanels();
                setShowFeeds(true);
              }}
              title="View Feeds"
            >
              ◎
            </button>
            <button
              className={`btn btn-icon ${showSettings ? 'active' : ''}`}
              onClick={() => {
                closePanels();
                setShowSettings(true);
              }}
              title="Settings"
            >
              ✎
            </button>
            <NotificationToggle
              enabled={notificationsEnabled}
              onToggle={handleNotificationToggle}
            />
          </div>
        </div>
      </header>

      <main className="main">
        {showSettings && (
          <div className="panel-overlay">
            <SettingsPanel
              preferences={preferences}
              onUpdate={handlePreferencesUpdate}
              onClose={() => setShowSettings(false)}
              categories={categories.filter(c => c !== 'all')}
              feeds={feeds}
            />
          </div>
        )}

        {showFeeds && (
          <div className="panel-overlay">
            <FeedList
              feeds={feeds}
              onClose={() => setShowFeeds(false)}
            />
          </div>
        )}

        {showHistory && (
          <div className="panel-overlay">
            <NotificationHistory
              userId={userId}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}

        <form className="search-bar" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI, VR, chips, breakthroughs…"
            aria-label="Search articles"
          />
          <button type="submit" className="btn btn-primary">Search</button>
          {activeSearch && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setActiveSearch('');
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-row">
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {CATEGORY_LABELS[category] || (category.charAt(0).toUpperCase() + category.slice(1))}
              </button>
            ))}
          </div>
          <div className="view-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'favorites', label: 'Saved' }
            ].map(mode => (
              <button
                key={mode.id}
                className={`category-tab ${viewMode === mode.id ? 'active' : ''}`}
                onClick={() => setViewMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="results-meta">
          {pagination.total > 0
            ? `${pagination.total.toLocaleString()} high-signal stories`
            : 'No matching stories'}
          {activeSearch ? ` · “${activeSearch}”` : ''}
        </div>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading articles…</div>
        ) : (
          <ArticleList
            articles={articles}
            onToggleRead={handleToggleRead}
            onToggleFavorite={handleToggleFavorite}
            hasMore={pagination.hasMore}
            onLoadMore={() => loadArticles(false)}
            loadingMore={loadingMore}
          />
        )}
      </main>
    </div>
  );
}

export default App;
