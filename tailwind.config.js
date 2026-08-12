/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a365d',
          dark: '#0f2744',
          secondary: '#2c5282',
        },
        accent: '#d4a574',
        ai: '#06b6d4',
        bim: '#8b5cf6',
        forest: '#0B3D2E',
        gold: '#C9A227',
        charcoal: '#1A1A1A',
        steelBlue: '#4A6FA5',
        concreteGrey: '#8C8C8C',
        safetyOrange: '#E85D04',
        earthBrown: '#5D4037',
        dustySand: '#D7CCC8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'border-beam': 'border-beam 3s linear infinite',
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'pulse-border': 'pulse-border 2.2s ease-in-out infinite',
        'ticker-scroll': 'ticker-scroll 40s linear infinite',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        modal: '0 12px 40px rgba(0,0,0,0.12)',
        gold: '0 0 20px rgba(201,162,39,0.15)',
        'gold-lg': '0 0 32px rgba(201,162,39,0.22)',
        'steel-glow': '0 0 16px rgba(74,111,165,0.25)',
      },
      keyframes: {
        'border-beam': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0) scale(1)', opacity: '0.8' },
          '50%': { transform: 'translate(2%, -1%) scale(1.05)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,162,39,0.45)' },
          '50%': { boxShadow: '0 0 0 6px rgba(201,162,39,0)' },
        },
        'ticker-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
