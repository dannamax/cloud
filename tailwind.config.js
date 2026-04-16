/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        background: {
          DEFAULT: 'hsl(var(--background))',
          card: 'hsl(var(--card))',
          border: 'hsl(var(--border))',
          foreground: 'hsl(var(--foreground))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
        },
        status: {
          online: '#22C55E',
          offline: '#EF4444',
          warning: '#F59E0B',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          foreground: 'hsl(var(--foreground))',
        },
        input: {
          DEFAULT: 'hsl(var(--input))',
        },
        ring: {
          DEFAULT: 'hsl(var(--ring))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        // 主题感知的 slate 颜色
        slate: {
          DEFAULT: 'hsl(var(--foreground))',
          50: 'hsl(var(--background))',
          100: 'hsl(var(--muted))',
          200: 'hsl(var(--muted))',
          300: 'hsl(var(--muted-foreground))',
          400: 'hsl(var(--muted-foreground))',
          500: 'hsl(var(--muted-foreground))',
        },
        // 主题感知的 white/black
        white: 'hsl(var(--foreground))',
        black: 'hsl(var(--background))',
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
