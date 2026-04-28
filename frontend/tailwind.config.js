/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        persona: {
          bg: '#F5F5F0',
          card: '#FFFFFF',
          dark: '#1A1A1A',
          muted: '#6B7280',
          line: '#E8E5DC',
          warn: '#B45309',
          danger: '#B91C1C',
          accent: {
            yellow: '#F0E68C',
            lavender: '#D8B4FE',
            lime: '#BEF264',
            pink: '#FBCFE8',
            blue: '#93C5FD',
            peach: '#FDBA74',
          },
        },
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      maxWidth: {
        prose: '65ch',
        shell: '76rem',
      },
      boxShadow: {
        warm: '0 1px 2px rgba(70,50,30,0.04), 0 4px 14px rgba(70,50,30,0.06)',
        'warm-lg': '0 4px 8px rgba(70,50,30,0.05), 0 16px 40px rgba(70,50,30,0.10)',
        'warm-inner': 'inset 0 1px 2px rgba(70,50,30,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
