/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cobalt: '#1a365d',
        sand: '#d4a574',
        cyan: '#06B6D4',
        violet: '#8B5CF6',
        darkbase: '#0b1220',
        surface: '#111c31',
        bordercol: '#24324b'
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}