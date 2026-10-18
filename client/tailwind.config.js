/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        slate: {
          850: '#152033',
          950: '#0b1120',
        },
        flame: {
          DEFAULT: '#FF5A26',
          soft: '#FF7A45',
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 14px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'shimmer-sweep': {
          from: { transform: 'translate3d(-100%, 0, 0)' },
          to: { transform: 'translate3d(100%, 0, 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer-sweep': 'shimmer-sweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
