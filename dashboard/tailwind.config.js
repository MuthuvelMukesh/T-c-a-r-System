/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#060b14',
          900: '#0b1220',
          800: '#111b2d',
          700: '#18253d'
        },
        accent: {
          cyan: '#5eead4',
          amber: '#fbbf24',
          red: '#f87171',
          emerald: '#34d399',
          blue: '#60a5fa',
          violet: '#a78bfa'
        }
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(148,163,184,0.12), 0 20px 35px rgba(2,6,23,0.35)'
      }
    },
  },
  plugins: [],
};
