import { useEffect, useState } from 'react';

const COMPACT_MEDIA_QUERY = '(max-width: 760px)';

export function useCompactScreen() {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsCompact(event.matches);
    };

    update(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isCompact;
}
