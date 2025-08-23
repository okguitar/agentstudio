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
          50: '#f0f2ff',
          100: '#e0e4ff',
          500: '#1d4ed8',
          600: '#1e40af',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}