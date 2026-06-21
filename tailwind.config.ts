import type { Config } from "tailwindcss"

const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "spring-pink": "#FA92B2",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-noto-serif-tc)"],
      },
    },
  },
  plugins: [],
} satisfies Config

export default config