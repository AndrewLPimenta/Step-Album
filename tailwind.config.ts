import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // -apple-system na frente: em macOS/iOS resolve pra San Francisco.
        // Fora da Apple cai no Inter (--font-sans), o substituto mais proximo.
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "var(--font-sans)", "Segoe UI", "sans-serif"],
        // Numeros grandes e headlines: mesma familia, pesos de display. Era
        // uma serifada (Fraunces) ate' a virada pra tipografia Apple.
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "var(--font-display)", "Segoe UI", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Fonte unica de cor de status/tipo de album. Os mapas em
        // src/lib/constants.ts referenciam so' estes tokens — nenhum
        // componente escolhe cor de status ou de tipo por conta propria.
        status: {
          idle: "hsl(var(--status-idle) / <alpha-value>)",
          active: "hsl(var(--status-active) / <alpha-value>)",
          assembled: "hsl(var(--status-assembled) / <alpha-value>)",
          sent: "hsl(var(--status-sent) / <alpha-value>)",
          done: "hsl(var(--status-done) / <alpha-value>)",
          excluded: "hsl(var(--status-excluded) / <alpha-value>)",
          problem: "hsl(var(--status-problem) / <alpha-value>)",
        },
        type: {
          colab: "hsl(var(--type-colab) / <alpha-value>)",
          faculdade: "hsl(var(--type-faculdade) / <alpha-value>)",
          especial: "hsl(var(--type-especial) / <alpha-value>)",
          medicina: "hsl(var(--type-medicina) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
