import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-text': 'var(--accent-text)',
        'accent-soft': 'var(--accent-soft)',
        'accent-hover': 'var(--accent-hover)',
        ao3: 'var(--ao3)',
        'ao3-bg': 'var(--ao3-bg)',
        ffn: 'var(--ffn)',
        'ffn-bg': 'var(--ffn-bg)',
        wattpad: 'var(--wattpad)',
        'wattpad-bg': 'var(--wattpad-bg)',
        'rating-g': 'var(--rating-g)',
        'rating-g-bg': 'var(--rating-g-bg)',
        'rating-t': 'var(--rating-t)',
        'rating-t-bg': 'var(--rating-t-bg)',
        'rating-m': 'var(--rating-m)',
        'rating-m-bg': 'var(--rating-m-bg)',
        'rating-e': 'var(--rating-e)',
        'rating-e-bg': 'var(--rating-e-bg)',
        'score-high': 'var(--score-high)',
        'score-mid': 'var(--score-mid)',
        'score-low': 'var(--score-low)',
        'status-complete': 'var(--status-complete)',
        'status-wip': 'var(--status-wip)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-border': 'var(--danger-border)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Source Serif 4', 'Georgia', 'serif'],
        display: ['var(--font-source-serif)', 'Source Serif 4', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
      },
      maxWidth: {
        content: '960px',
        results: '1200px',
        prose: '65ch',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        offset: 'var(--shadow-offset)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms var(--ease-out) both',
        'scale-in': 'scale-in 200ms var(--ease-out) both',
      },
    },
  },
  plugins: [],
};

export default config;
