/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        rail: {
          950: "#050811",
          900: "#070B14",
          850: "#0B101E",
          800: "#0F172A",
          750: "#15203B",
          700: "#1E293B",
          600: "#334155",
          500: "#475569",
        },
        signal: {
          green: "#10B981",
          yellow: "#F59E0B",
          amber: "#D97706",
          red: "#EF4444",
          cyan: "#06B6D4",
          blue: "#3B82F6",
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowCyan 2.5s ease-in-out infinite alternate',
        'glow-emerald': 'glowEmerald 2.5s ease-in-out infinite alternate',
        'signal-blink': 'signalBlink 1.5s ease-in-out infinite',
        'train-glide': 'trainGlide 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        glowCyan: {
          '0%': { boxShadow: '0 0 10px rgba(6, 182, 212, 0.2), inset 0 0 10px rgba(6, 182, 212, 0.1)' },
          '100%': { boxShadow: '0 0 24px rgba(6, 182, 212, 0.5), inset 0 0 15px rgba(6, 182, 212, 0.25)' },
        },
        glowEmerald: {
          '0%': { boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)' },
        },
        signalBlink: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.92)' },
        },
        trainGlide: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
