/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1336',
          dark: '#070D26',
          light: '#16204E',
        },
        brand: {
          navy: '#0B1336',
          orange: '#FF5B00',
          'orange-hover': '#E65200',
          'orange-light': '#FFF0E6',
        },
      },
    },
  },
  plugins: [],
};
