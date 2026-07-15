import { useCallback, useEffect, useState } from 'react';

export function navigate(to, { replace = false } = {}) {
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const [pathname, setPathname] = useState(
    () => window.location.pathname || '/'
  );

  useEffect(() => {
    const onChange = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  const go = useCallback((to, opts) => {
    navigate(to, opts);
  }, []);

  return [pathname, go];
}
