/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#E4DFD3",
        "paper-card": "#DCD6C6",
        "paper-card-alt": "#D3CBB6",
        ink: "#24211C",
        "ink-muted": "#5C574A",
        "ink-faint": "#8A8578",
        thread: "#8C2F26",
        "thread-soft": "#B25B4C",
        gold: "#A5822F",
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
