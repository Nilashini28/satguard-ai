import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00ff88",
        secondary: "#00ccff",
        accent: "#ff00aa",
        dark: "#0a0a0f",
        darker: "#050508",
        card: "#12121a",
        border: "#1e1e2e",
      },
    },
  },
  plugins: [],
};
export default config;