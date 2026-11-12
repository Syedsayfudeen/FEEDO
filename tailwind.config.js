/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FEEDO Primary Design System: Deep Maroon / Burgundy + Soft Blush + Warm Cream
        emerald: {
          50: '#fdf3f5',
          100: '#fbe4e9',
          200: '#f6cbd5',
          300: '#eea2b5',
          400: '#e26d8b',
          500: '#cf3f65',
          600: '#b3244b',
          700: '#8e1838',
          800: '#74142f',
          900: '#5e1127',
          950: '#390715',
        },
        maroon: {
          50: '#fdf3f5',
          100: '#fbe4e9',
          200: '#f6cbd5',
          300: '#eea2b5',
          400: '#e26d8b',
          500: '#cf3f65',
          600: '#b3244b',
          700: '#8e1838',
          800: '#74142f',
          900: '#5e1127',
          950: '#390715',
        },
        ivory: {
          50: '#fdfaf6',
          100: '#f9f3eb',
          200: '#f2e8dc',
          300: '#e6d7c5',
        },
        charcoal: {
          800: '#2b1e21',
          900: '#1c1215',
          950: '#120a0c',
        },
        gold: {
          300: '#f6d88c',
          400: '#ebb94c',
          500: '#d69b26',
          600: '#b37b14',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(94, 17, 39, 0.08)',
        'premium': '0 20px 40px -15px rgba(94, 17, 39, 0.11)',
      }
    },
  },
  plugins: [],
}
