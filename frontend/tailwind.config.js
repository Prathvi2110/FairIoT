/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#102A43',
        teal: '#0B8F87',
        ice: '#EFF7FB',
        ink: '#243B53',
        muted: '#627D98',
        line: '#D9E6EE',
      },
      boxShadow: {
        soft: '0 8px 26px rgba(16, 42, 67, 0.07)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
