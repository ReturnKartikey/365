/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#121316',
        surface: {
          DEFAULT: '#191816',
          container: '#201F1C',
          elevated: '#282622',
          high: '#322E2A',
        },
        primary: {
          DEFAULT: '#D87D4A',
          hover: '#E58B58',
          light: '#F5DED2',
          container: '#3D2214',
        },
        amber: {
          DEFAULT: '#E09F3E',
          glow: 'rgba(224, 159, 62, 0.15)',
        },
        cream: {
          DEFAULT: '#F5ECE1',
          muted: '#C4B9AD',
        },
        muted: '#948D85',
        border: {
          DEFAULT: '#332F2A',
          subtle: '#24211D',
          hover: '#4D4740',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
