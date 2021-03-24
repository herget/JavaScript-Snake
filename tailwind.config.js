const colors = require('tailwindcss/colors')

module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        gray: {
          450: '#404040'
        },
        green: {
          450: '#BFDCC0'
        }
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
