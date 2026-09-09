import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export const useTheme = (): Theme => {
  const getTheme = useCallback((): Theme => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }, []);

  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [getTheme]);

  return theme;
};