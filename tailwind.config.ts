import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: "#0a0a0f",
          100: "#12121a",
          200: "#1a1a2e",
          300: "#252540",
        },
        neon: {
          cyan: "#00f5ff",
          magenta: "#ff00ff",
          green: "#00ff41",
          yellow: "#ffff00",
          orange: "#ff6600",
        },
      },
      fontFamily: {
        gaming: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "rgb-border": "rgbBorder 3s linear infinite",
        "rgb-glow": "rgbGlow 2s ease-in-out infinite",
        "pulse-neon": "pulseNeon 1.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        rgbBorder: {
          "0%, 100%": { borderColor: "#00f5ff" },
          "33%": { borderColor: "#ff00ff" },
          "66%": { borderColor: "#00ff41" },
        },
        rgbGlow: {
          "0%, 100%": { boxShadow: "0 0 10px #00f5ff, 0 0 20px #00f5ff33" },
          "33%": { boxShadow: "0 0 10px #ff00ff, 0 0 20px #ff00ff33" },
          "66%": { boxShadow: "0 0 10px #00ff41, 0 0 20px #00ff4133" },
        },
        pulseNeon: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
