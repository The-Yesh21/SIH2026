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
          DEFAULT: "#0C1018",
          light: "#111827",
        },
        surface: {
          DEFAULT: "#151C2C",
          raised: "#1C2538",
          overlay: "#212B3F",
        },
        graphite: {
          DEFAULT: "#2A3348",
          light: "#384460",
        },
        steel: {
          DEFAULT: "#8892A8",
          light: "#A8B0C4",
        },
        chalk: {
          DEFAULT: "#E8ECF4",
          dim: "#C0C8D8",
        },
        signal: {
          green: "#22C55E",
          "green-muted": "#166534",
          amber: "#F59E0B",
          "amber-muted": "#78350F",
          red: "#DC2626",
          "red-muted": "#7F1D1D",
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
