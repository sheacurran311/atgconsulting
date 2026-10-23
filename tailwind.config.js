/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#14213D",
          50: "#f0f3f8",
          100: "#d9e1ed",
          200: "#b3c3da",
          300: "#8da5c8",
          400: "#5f7dab",
          500: "#3a5d8e",
          600: "#2a4a73",
          700: "#1e3757",
          800: "#14213D",
          900: "#0d1728",
        },
        orange: {
          DEFAULT: "#F2994A",
          50: "#fef7ed",
          100: "#fdecd5",
          200: "#fbd5a9",
          300: "#f8b773",
          400: "#F2994A",
          500: "#ef7c1c",
          600: "#d96212",
          700: "#b44b10",
          800: "#913c14",
          900: "#753313",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
