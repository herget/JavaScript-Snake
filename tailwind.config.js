const colors = require('tailwindcss/colors')

module.exports = {
  purge: {
    enabled: true,
    content: ['./css/main-snake.css'],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      'body': ['Silkscreen']
     },
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
