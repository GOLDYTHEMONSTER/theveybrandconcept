/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0a",
        surface: "rgba(255,255,255,0.06)",
        "surface-hover": "rgba(255,255,255,0.1)",
        ink: "#f7f7f5",
        muted: "#9b9b9b",
        hairline: "rgba(255,255,255,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
