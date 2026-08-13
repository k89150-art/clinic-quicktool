/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17312e',
        clinic: { 50: '#edf8f6', 100: '#d4efeb', 600: '#0b7c71', 700: '#0b6b63', 800: '#0a554f' }
      },
      boxShadow: { soft: '0 12px 34px rgba(31, 67, 62, 0.08)' }
    }
  },
  plugins: []
};
