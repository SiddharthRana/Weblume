'use client';

import { useSyncExternalStore } from 'react';
import { THEME_KEY, type Theme } from '@/lib/theme';

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Re-reads the theme when it's switched here or the system setting changes. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
}

/** Switches between light and dark and remembers the choice on this device. */
export function ThemeToggle() {
  // null while server-rendering; the real theme once in the browser.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the switch still applies to this page view.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${next} theme` : 'Switch colour theme'}
      title={theme ? `Switch to ${next} theme` : undefined}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        {theme === 'dark' ? (
          // Sun: shown in dark mode, switches to light.
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </g>
        ) : (
          <path
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity={theme ? 1 : 0}
          />
        )}
      </svg>
    </button>
  );
}
