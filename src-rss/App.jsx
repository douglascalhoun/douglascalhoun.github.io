import React, { useState, useEffect } from 'react';
import ArticleList from './components/ArticleList';
import SettingsPanel from './components/SettingsPanel';
import FeedList from './components/FeedList';
import NotificationToggle from './components/NotificationToggle';
import { subscribeToNotifications, unsubscribeFromNotifications } from './services/notifications';
import * as api from './services/api';

function App() {
  const [articles, setArticles] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeeds, setShowFeeds] = useState(false);
  const [preferences, setPreferences] = useState({
    keywords: [],
    excludedKeywords: [],
    categories: [],
    countries: []
  });

  useEffect(() => {
    loadArticles();
    loadFeeds();
    checkNotificationStatus();
  }, [selectedCategory]);

  async function loadArticles() {
    try {
      setLoading(true);
      const data = await api.fetchArticles(selectedCategory === 'all' ? null : selectedCategory);
      setArticles(data.articles || []);
      setError(null);
    } catch (err) {
      setError('Failed to load articles: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
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
      setNotificationsEnabled(Notification.permission === 'granted');
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
    
    // If notifications are enabled, update subscription
    if (notificationsEnabled) {
      try {
        await subscribeToNotifications(newPreferences);
      } catch (err) {
        console.error('Failed to update preferences:', err);
      }
    }
  }

  function handleRefresh() {
    loadArticles();
    loadFeeds();
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>📰 RSS News Aggregator</h1>
          <div className="header-actions">
            <button 
              className="btn btn-icon"
              onClick={handleRefresh}
              title="Refresh"
            >
              🔄
            </button>
            <button 
              className={`btn btn-icon ${showFeeds ? 'active' : ''}`}
              onClick={() => {
                setShowFeeds(!showFeeds);
                setShowSettings(false);
              }}
              title="View Feeds"
            >
              📡
            </button>
            <button 
              className={`btn btn-icon ${showSettings ? 'active' : ''}`}
              onClick={() => {
                setShowSettings(!showSettings);
                setShowFeeds(false);
              }}
              title="Settings"
            >
              ⚙️
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

        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading articles...</div>
        ) : (
          <ArticleList articles={articles} />
        )}
      </main>
    </div>
  );
}

export default App;
