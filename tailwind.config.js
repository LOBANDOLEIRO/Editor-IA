/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#0d0f14",
          panel: "#151821",
          panel2: "#1b1f2a",
          line: "#262b38",
          text: "#e6e8ee",
          dim: "#8b92a5",
          accent: "#ff7a1a",
          rec: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
