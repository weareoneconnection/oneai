// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ✅ Tailwind v4 兼容写法

  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {},
  },

  plugins: [],
};

export default config;