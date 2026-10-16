module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        raised: "var(--raised)",
        line: "var(--line)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        stage: "var(--stage)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-soft": "var(--accent-soft)",
        good: "var(--good)",
        warn: "var(--warn)",
        bad: "var(--bad)",
      },
      fontFamily: {
        display: "var(--font-display)",
        ui: "var(--font-ui)",
        mono: "var(--font-mono)",
      },
    },
  },
  plugins: [],
}
