// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        "dropdown-in": {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "dropdown-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
        },
      },
      animation: {
        "dropdown-in": "dropdown-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "dropdown-out": "dropdown-out 140ms ease-in",
      },
    },
  },
}

