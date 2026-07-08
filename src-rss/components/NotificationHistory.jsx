import React, { useEffect, useState } from 'react';
import * as api from '../services/api';

function NotificationHistory({ userId, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.fetchNotificationHistory(userId, 50);
        setNotifications(data.notifications || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>Notification History</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        {loading && <div className="loading">Loading history…</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && notifications.length === 0 && (
          <div className="empty-state">
            <p>No notifications sent yet. Enable the bell to start receiving alerts.</p>
          </div>
        )}
        <div className="history-list">
          {notifications.map(item => (
            <a
              key={item.id}
              className="history-item"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="history-meta">
                <span className="article-source">{item.feed_name}</span>
                <span className={`status-pill status-${item.status}`}>{item.status}</span>
                <span className="article-date">
                  {new Date(item.sent_at).toLocaleString()}
                </span>
              </div>
              <div className="history-title">{item.title}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="panel-footer">
        <button onClick={onClose} className="btn btn-primary">Close</button>
      </div>
    </div>
  );
}

export default NotificationHistory;
