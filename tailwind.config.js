/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EBF2FE',
          100: '#D7E6FD',
          200: '#AFCDFB',
          300: '#87B4F9',
          400: '#5F9BF7',
          500: '#3B82F6',
          600: '#0B61E4',
          700: '#084AB0',
          800: '#06347C',
          900: '#031D48',
        },
        background: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          foreground: '#F1F5F9',
        },
        foreground: {
          DEFAULT: '#F1F5F9',
        },
        status: {
          online: '#22C55E',
          offline: '#EF4444',
          warning: '#F59E0B',
        },
        border: {
          DEFAULT: '#334155',
          foreground: '#F1F5F9',
        },
        input: {
          DEFAULT: '#334155',
        },
        ring: {
          DEFAULT: '#3B82F6',
        },
        card: {
          DEFAULT: '#1E293B',
          foreground: '#F1F5F9',
        },
        muted: {
          DEFAULT: '#334155',
          foreground: '#94A3B8',
        },
        accent: {
          DEFAULT: '#334155',
          foreground: '#F1F5F9',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#F1F5F9',
        },
        popover: {
          DEFAULT: '#1E293B',
          foreground: '#F1F5F9',
        },
        secondary: {
          DEFAULT: '#334155',
          foreground: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
