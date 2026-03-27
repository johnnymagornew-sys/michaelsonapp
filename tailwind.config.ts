import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1a',
        card: '#242424',
        'card-high': '#2e2e2e',
        border: '#2e2e2e',
        'border-subtle': '#1e1e1e',
        primary: '#dc2626',
        'primary-dark': '#991b1b',
        'primary-light': '#ef4444',
        'text-primary': '#f1f1f1',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',
        info: '#0284c7',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',  // 2px
        sm: '0.25rem',        // 4px
        md: '0.375rem',
        lg: '0.5rem',         // 8px MAX
        xl: '0.5rem',         // cap at 8px
        '2xl': '0.5rem',      // cap at 8px
        full: '9999px',       // keep for actual circles (avatars)
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}
export default config
