import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#c8000a",
          dark: "#9b0007",
          bg: "#fff5f5",
        },
        ink: {
          DEFAULT: "#111111",
          2: "#3d3d3d",
          3: "#6b6b6b",
          4: "#9e9e9e",
        },
        rule: {
          DEFAULT: "#dddddd",
          light: "#eeeeee",
        },
        bg: {
          DEFAULT: "#fafaf8",
          2: "#f4f4f2",
          3: "#efefed",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        site: "1160px",
      },
      borderRadius: {
        DEFAULT: "0px",
      },
      lineHeight: {
        recipe: "1.85",
      },
      aspectRatio: {
        "recipe-card": "3 / 2",
      },
      typography: {
        DEFAULT: {
          css: {
            fontFamily: "var(--font-sans)",
            color: "#3d3d3d",
            lineHeight: "1.8",
            "h1,h2,h3,h4": { fontFamily: "var(--font-serif)", color: "#111111" },
            a: { color: "#c8000a" },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
