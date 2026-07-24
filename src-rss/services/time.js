/** Relative timestamps for the desk. */

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 60) return rtf.format(diffSec, 'second');
  const mins = Math.round(diffSec / 60);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(diffSec / 3600);
  if (Math.abs(hours) < 36) return rtf.format(hours, 'hour');
  const days = Math.round(diffSec / 86400);
  if (Math.abs(days) < 14) return rtf.format(days, 'day');
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatClock(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
