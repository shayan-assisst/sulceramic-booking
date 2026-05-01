import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        terracotta: {
          DEFAULT: "#C17A4A",
          50: "#FAF1EA",
          100: "#F4E1D2",
          200: "#E9C3A6",
          300: "#DDA579",
          400: "#D2885A",
          500: "#C17A4A",
          600: "#A2643B",
          700: "#7C4C2D",
          800: "#56341F",
          900: "#3D2B1F",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          50: "#FBF8F3",
          100: "#F5F0E8",
          200: "#EAE0CF",
        },
        clay: {
          dark: "#3D2B1F",
          mid: "#7C4C2D",
        },
        background: "#F5F0E8",
        foreground: "#3D2B1F",
        primary: {
          DEFAULT: "#C17A4A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#EAE0CF",
          foreground: "#3D2B1F",
        },
        muted: {
          DEFAULT: "#EAE0CF",
          foreground: "#7C4C2D",
        },
        accent: {
          DEFAULT: "#DDA579",
          foreground: "#3D2B1F",
        },
        destructive: {
          DEFAULT: "#B45252",
          foreground: "#FFFFFF",
        },
        border: "#E0D2BE",
        input: "#E0D2BE",
        ring: "#C17A4A",
        card: {
          DEFAULT: "#FBF8F3",
          foreground: "#3D2B1F",
        },
        popover: {
          DEFAULT: "#FBF8F3",
          foreground: "#3D2B1F",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
