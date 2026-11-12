/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#fff9ef',
          100: '#f8f0e1',
          200: '#ead7b4',
          300: '#e9d5a5',
          400: '#d6b879',
          500: '#c59c5a',
          600: '#a98242',
          700: '#253452',
          800: '#182642',
          900: '#101b35',
          950: '#0b1428',
        },
        maroon: {
          50: '#fff9ef',
          100: '#f8f0e1',
          200: '#ead7b4',
          300: '#e9d5a5',
          400: '#d6b879',
          500: '#c59c5a',
          600: '#a98242',
          700: '#253452',
          800: '#182642',
          900: '#101b35',
          950: '#0b1428',
        },
        ivory: {
          50: '#fff9ef',
          100: '#f8f0e1',
          200: '#eee1cb',
          300: '#ddccb0',
        },
        charcoal: {
          800: '#343846',
          900: '#202431',
          950: '#0b1428',
        },
        gold: {
          300: '#e9d5a5',
          400: '#d6b879',
          500: '#c59c5a',
          600: '#a98242',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glass: '0 12px 36px rgba(11, 20, 40, 0.16)',
        premium: '0 20px 50px -18px rgba(11, 20, 40, 0.22)',
      },
    },
  },
  plugins: [],
};
