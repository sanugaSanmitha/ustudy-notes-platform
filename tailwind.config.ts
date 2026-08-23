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
        display: ["var(--font-hanken)", "var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-noto-serif-tc)"],
      },
      keyframes: {
        "profile-glass": {
          "0%": { transform: "translateX(-140%) skewX(-12deg)" },
          "100%": { transform: "translateX(240%) skewX(-12deg)" },
        },
        "hover-marquee": {
          "0%, 12%": { transform: "translateX(0)" },
          "48%, 62%": { transform: "translateX(min(0px, calc(-100% + 100cqi)))" },
          "88%, 100%": { transform: "translateX(0)" },
        },
        "search-caret": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "profile-glass": "profile-glass 6s ease-in-out infinite",
        "hover-marquee": "hover-marquee 4.5s ease-in-out infinite",
        "search-caret": "search-caret 0.9s steps(1, end) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config