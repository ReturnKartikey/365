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
        background: '#0F1115',
        surface: '#181A20',
        'surface-elevated': '#22252D',
        primary: {
          DEFAULT: '#C67D5A',
          hover: '#D48E6B',
          light: '#F4E5DF',
        },
        accent: '#297373',
        muted: '#8A919E',
        border: '#2C303B',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
