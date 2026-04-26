/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--bg-base)',
          panel: 'var(--bg-panel)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          elevated: 'var(--bg-elevated)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        edge: {
          soft: 'var(--border)',
          medium: 'var(--border-med)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dim: 'var(--accent-dim)',
          mid: 'var(--accent-mid)',
          text: 'var(--accent-text)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          dim: 'var(--danger-dim)',
          mid: 'var(--danger-mid)',
        },
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
