/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#08080c',
          secondary: '#0d0d12',
          card: '#111116',
          elevated: '#16161d',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          hover: '#a78bfa',
          muted: 'rgba(139, 92, 246, 0.15)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
