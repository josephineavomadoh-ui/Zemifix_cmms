/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#080E29',
          dark: '#080E29',
          light: '#0B1336',
        },
        brand: {
          navy:            '#080E29',
          navyAlt:         '#0B1336',
          'navy-secondary': '#0B1336',
          orange:          '#FF5B00',
          orangeAlt:       '#F95700',
          'orange-hover':   '#F95700',
          'orange-secondary':'#F95700',
          'orange-light':  '#FFF0E6',
          bgMain:          '#F8FAFC',
          bgSecondary:     '#F1F5F9',
          border:          '#E2E8F0',
          textPrimary:     '#0F172A',
          textSecondary:   '#64748B',
          success:         '#16A34A',
          warning:         '#D97706',
          error:           '#DC2626',
        },
      },
    },
  },
  plugins: [],
};
