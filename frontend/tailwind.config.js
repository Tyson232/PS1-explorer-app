/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#0F172A',
          secondary: '#1E293B',
          card:      '#1E293B',
          hover:     '#273349',
          border:    '#334155'
        },
        accent: {
          purple: '#3B82F6',   // electric blue — kept as "purple" for class-name compatibility
          teal:   '#10B981',
          pink:   '#EC4899',
          amber:  '#F59E0B'
        },
        text: {
          primary:   '#F8FAFC',
          secondary: '#94A3B8',
          muted:     '#64748B'
        }
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace']
      },
      borderRadius: {
        card: '12px'
      },
      boxShadow: {
        card:       '0 4px 6px rgba(0,0,0,0.25)',
        'card-hover': '0 8px 20px rgba(0,0,0,0.35)'
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'shimmer':    'shimmer 1.5s infinite linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};
