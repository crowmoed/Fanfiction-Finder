import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-hover': 'var(--bg-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'border-default': 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-hover': 'var(--accent-hover)',
        'ao3-red': 'var(--ao3-red)',
        'ao3-red-bg': 'var(--ao3-red-bg)',
        'ffn-blue': 'var(--ffn-blue)',
        'ffn-blue-bg': 'var(--ffn-blue-bg)',
        'score-high': 'var(--score-high)',
        'score-mid': 'var(--score-mid)',
        'score-low': 'var(--score-low)',
        'status-complete': 'var(--status-complete)',
        'status-wip': 'var(--status-wip)',
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Instrument Serif', 'serif'],
        display: ['var(--font-instrument-serif)', 'Instrument Serif', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        content: '960px',
        table: '1200px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.6' },
        },
        shimmer: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        shine: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        'word-rotate': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fillBar: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
      animation: {
        pulse: 'pulse 1.5s ease-in-out infinite',
        aurora: 'aurora 10s ease-in-out infinite alternate',
        shimmer: 'shimmer 2.5s linear infinite',
        shine: 'shine 14s linear infinite',
        'word-rotate': 'word-rotate 0.4s ease-out',
        'fade-slide-up': 'fadeSlideUp 200ms ease-out forwards',
        'scale-in': 'scaleIn 200ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
