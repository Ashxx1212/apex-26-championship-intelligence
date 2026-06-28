/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: '#0a0a0c',
          light: '#121215',
        },
        crimson: {
          DEFAULT: '#dc143c',
          dark: '#a80f2e',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          dark: '#00a8cc',
        },
        amber: {
          DEFAULT: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'speed-line': 'speed-line 3s linear infinite',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        'speed-line': {
          '0%': { left: '-100%', opacity: '0' },
          '30%': { opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        'radar-sweep': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'scan': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
