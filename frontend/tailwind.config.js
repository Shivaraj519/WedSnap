/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warmbeige: {
          50: '#FDFBF7',
          100: '#FBF5ED',
          200: '#F5E8D8',
          300: '#EED6BF',
          400: '#E4BE9E',
          500: '#D5A47D',
          DEFAULT: '#F7EFE5',
          surface: '#F1E5D5',
        },
        warmorange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          DEFAULT: '#E58A4E',
          accent: '#D06B2C',
          dark: '#B05018',
        },
        ivory: {
          DEFAULT: '#F9F3EA',
          light: '#FDF9F3',
          dark: '#EFE3D3',
        },
        cream: {
          DEFAULT: '#F5EBE0',
          surface: '#EBDCCE',
        },
        charcoal: {
          DEFAULT: '#262220',
          light: '#3F3936',
          muted: '#6B625D',
        },
        champagne: {
          DEFAULT: '#D49B5E',
          hover: '#C2894D',
          light: '#F5DEC7',
          accent: '#9E6B34',
        },
        gold: '#D4AF37',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
