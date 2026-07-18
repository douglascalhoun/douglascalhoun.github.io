const KEY = 'worldwire.userId';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ww_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getUserId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}
