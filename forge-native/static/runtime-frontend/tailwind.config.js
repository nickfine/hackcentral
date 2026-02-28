/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-color-mode="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // =======================================================================
      // COLORS - Theme-aware using CSS variables
      // =======================================================================
      colors: {
        // Arena surfaces - use CSS variables for theme-aware colors
        arena: {
          black: 'var(--surface-secondary)',
          bg: 'var(--surface-secondary)',
          card: 'var(--surface-primary)',
          elevated: 'var(--surface-elevated)',
          border: 'var(--border-default)',
          'border-strong': 'var(--color-border-strong)',
          'glass': 'var(--surface-glass)',
          'glass-border': 'var(--border-subtle)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-disabled)',
        },
        
        // Brand color - HackDay orange
        brand: {
          DEFAULT: 'var(--accent-brand)',
          subtle: 'var(--accent-brand-subtle)',
          purple: 'var(--accent-purple)',
          magenta: 'var(--accent-magenta)',
          blue: 'var(--accent-blue-deep)',
          cyan: 'var(--accent-cyan)',
        },

        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        
        // Text colors
        text: {
          primary: 'var(--text-primary)',
          body: 'var(--text-secondary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-disabled)',
        },
        
        // Status Colors
        success: {
          DEFAULT: 'var(--status-success)',
          500: 'var(--status-success)',
        },
        
        warning: {
          DEFAULT: 'var(--status-warning)',
          500: 'var(--status-warning)',
        },
        
        error: {
          DEFAULT: 'var(--status-danger)',
          500: 'var(--status-danger)',
        },
        
        // Neutral scale
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      
      // =======================================================================
      // TYPOGRAPHY
      // =======================================================================
      fontFamily: {
        heading: ['Sora', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
        display: ['Sora', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        'display-1': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-2': ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
      
      // =======================================================================
      // BORDER RADIUS
      // =======================================================================
      borderRadius: {
        'none': '0',
        'sm': '6px',
        'DEFAULT': '0.375rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.5rem',
        'card': '12px',
        'full': '9999px',
      },
      
      // =======================================================================
      // BOX SHADOW
      // =======================================================================
      boxShadow: {
        'sm': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
        'none': 'none',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
        'glow-purple': '0 0 20px 4px rgba(160, 32, 240, 0.4)',
        'glow-orange': '0 0 20px 4px rgba(255, 107, 0, 0.4)',
      },
      
      // =======================================================================
      // ANIMATION
      // =======================================================================
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      
      // =======================================================================
      // TRANSITION
      // =======================================================================
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      // =======================================================================
      // Z-INDEX SCALE
      // =======================================================================
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
      },
      
      // =======================================================================
      // SPACING
      // =======================================================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
