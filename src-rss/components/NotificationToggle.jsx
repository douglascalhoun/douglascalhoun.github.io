import React from 'react';

function NotificationToggle({ enabled, onToggle }) {
  const supportsNotifications = 'Notification' in window;

  if (!supportsNotifications) {
    return null;
  }

  return (
    <button
      className={`btn btn-notification ${enabled ? 'enabled' : ''}`}
      onClick={onToggle}
      title={enabled ? 'Disable notifications' : 'Enable notifications'}
      aria-pressed={enabled}
    >
      {enabled ? 'On' : 'Alerts'}
    </button>
  );
}

export default NotificationToggle;
