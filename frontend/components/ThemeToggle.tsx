'use client';

import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md p-2 text-ink-2 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        // sun
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="10"
              y1="2"
              x2="10"
              y2="3.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${deg} 10 10)`}
            />
          ))}
        </svg>
      ) : (
        // moon
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
