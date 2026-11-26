/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FAF8F5',
          light: '#FDFBF9',
          dark: '#F3EDE6',
        },
        cream: {
          DEFAULT: '#F5EFEB',
          surface: '#EFE7DE',
        },
        charcoal: {
          DEFAULT: '#232120',
          light: '#3D3A38',
          muted: '#686461',
        },
        champagne: {
          DEFAULT: '#C5A880',
          hover: '#B5966B',
          light: '#EADBC8',
          accent: '#8C7456',
        },
        gold: '#D4AF37',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
