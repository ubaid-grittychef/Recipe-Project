import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Gradient classes used via dynamic mapping in categories/blog/homepage
    { pattern: /^from-(amber|orange|emerald|sky|violet|rose|teal|indigo|pink|lime|cyan|fuchsia|red|blue|green|yellow|slate)-(100|200|300|400)$/ },
    { pattern: /^to-(amber|orange|emerald|sky|violet|rose|teal|indigo|pink|lime|cyan|fuchsia|red|blue|green|yellow|slate)-(200|300|400|500)$/ },
    { pattern: /^via-(amber|orange|emerald|sky|violet|rose|teal|indigo|pink|lime|cyan|fuchsia|red|blue|green|yellow|slate)-(200|300)$/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary-500)",
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
        },
        warm: {
          cream: "var(--warm-cream)",
          sand: "var(--warm-sand)",
          beige: "var(--warm-beige)",
          border: "var(--warm-border)",
          "border-light": "var(--warm-border-light)",
          "border-dark": "var(--warm-border-dark)",
          muted: "var(--warm-muted)",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      lineHeight: {
        recipe: "1.85",
      },
      aspectRatio: {
        "recipe-card": "4 / 3",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.08)",
        "header": "0 1px 0 0 var(--warm-border), 0 2px 8px 0 rgba(0,0,0,0.06)",
        "header-dark": "0 1px 0 0 #1e293b, 0 2px 8px 0 rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [typography],
};

export default config;
