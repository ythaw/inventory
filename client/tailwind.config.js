/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        isocpeur: ['Isocpeur', 'sans-serif']
      },
      colors: {
        purple: {
          light: '#F5F5F5',
          soft: '#E8E0F5',
          medium: '#9B7EDE',
          dark: '#7C5CB8',
          darker: '#6B4FA0'
        }
      }
    },
  },
  plugins: [],
}


