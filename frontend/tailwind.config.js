/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':      { transform: 'translateX(-8px)' },
          '30%':      { transform: 'translateX(8px)' },
          '45%':      { transform: 'translateX(-6px)' },
          '60%':      { transform: 'translateX(6px)' },
          '75%':      { transform: 'translateX(-3px)' },
          '90%':      { transform: 'translateX(3px)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
