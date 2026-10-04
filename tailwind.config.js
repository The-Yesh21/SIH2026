/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: "#F8FAFC",
          light: "#F1F5F9",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          raised: "#F8FAFC",
          overlay: "#F1F5F9",
        },
        graphite: {
          DEFAULT: "#E2E8F0",
          light: "#CBD5E1",
        },
        steel: {
          DEFAULT: "#64748B",
          light: "#475569",
        },
        chalk: {
          DEFAULT: "#0F172A",
          dim: "#334155",
        },
        signal: {
          green: "#059669",
          "green-muted": "#ECFDF5",
          amber: "#D97706",
          "amber-muted": "#FEF3C7",
          red: "#DC2626",
          "red-muted": "#FEE2E2",
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-down': 'slideDown 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
