import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(222 51% 59%)",
        background: "hsl(210 33% 98%)",
        foreground: "hsl(222 47% 16%)",
        primary: {
          DEFAULT: "hsl(222 55% 52%)",
          foreground: "hsl(210 40% 96%)"
        },
        secondary: {
          DEFAULT: "hsl(210 28% 95%)",
          foreground: "hsl(222 47% 24%)"
        },
        muted: {
          DEFAULT: "hsl(210 28% 96%)",
          foreground: "hsl(222 15% 45%)"
        },
        accent: {
          DEFAULT: "hsl(206 32% 92%)",
          foreground: "hsl(222 47% 20%)"
        }
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        soft: "0 22px 45px -28px rgba(15, 23, 42, 0.45)",
        subtle: "0 12px 32px -20px rgba(15, 23, 42, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
