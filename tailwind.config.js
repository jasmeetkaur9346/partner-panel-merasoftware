/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jasmeet': {
          'pink': {
            DEFAULT: '#e91e63',
            'light': '#f48fb1',
            'dark': '#c2185b',
          },
          'teal': {
            DEFAULT: '#009688',
            'light': '#4db6ac',
            'dark': '#00796b',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

