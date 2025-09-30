import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spotify-inspired dark theme
        black: {
          base: "#0B0B0B",
          surface: "#121212",
        },
        gray: {
          dark: "#232323",
          text: {
            primary: "#EDEDED",
            secondary: "#B3B3B3",
          },
        },
        spotify: {
          green: "#1DB954",
        },
        accent: {
          cyan: "#22D3EE",
        },
        overlay: "rgba(255,255,255,0.04)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        normal: "0",
        wide: "0.025em",
      },
      lineHeight: {
        relaxed: "1.6",
        loose: "1.8",
      },
      animation: {
        "fade-in": "fadeIn 0.1s ease-in-out",
        "slide-up": "slideUp 0.12s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      boxShadow: {
        "spotify": "0 2px 8px rgba(0, 0, 0, 0.3)",
        "spotify-lg": "0 4px 16px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
