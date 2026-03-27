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
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}
export default config
