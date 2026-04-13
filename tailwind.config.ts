/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bronze: { DEFAULT: '#A8926A', light: '#C4AD8A', dark: '#8A7656' },
        ink: {
          DEFAULT: '#060610',
          mid: '#0B0B1A',
          card: '#101024',
          el: '#16162E',
          border: '#1E1E38',
        },
        tx: { DEFAULT: '#EAE6DE', mid: '#B0AAB0', dim: '#6A6478', ghost: '#3E3A50' },
        signal: { green: '#4ADE80', amber: '#F0C050', red: '#EF5555', blue: '#5B8DEE', purple: '#A78BFA' },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Figtree', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '10px', 'card-lg': '14px' },
    },
  },
  plugins: [],
}
