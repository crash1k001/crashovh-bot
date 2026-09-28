/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Admin panel shares the monochrome ink palette; white is the only
         * accent (buttons, active states), matching the main site. */
        admin: {
          panel: "#0b0b0b",
          line: "rgba(255,255,255,0.12)",
          lineStrong: "rgba(255,255,255,0.28)",
        },
        ink: {
          950: "#050505",
          900: "#0a0a0a",
          850: "#0f0f0f",
          800: "#141414",
          750: "#1a1a1a",
          700: "#202020",
          600: "#2a2a2a",
          500: "#3a3a3a",
          400: "#555555",
          300: "#7a7a7a",
          200: "#a1a1a1",
          100: "#d4d4d4",
          50: "#ededed",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-soft": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
