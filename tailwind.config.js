/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'app-bg': '#080D1A',
        'app-surface': '#0D1128',
        'app-card': 'rgba(255, 255, 255, 0.07)',
        'app-border': 'rgba(26, 143, 255, 0.28)',
        'app-border-hi': '#1A8FFF',
        'app-purple': '#1A8FFF',
        'app-purple-light': '#7EB8FF',
        'app-purple-dim': 'rgba(26, 143, 255, 0.35)',
        'app-muted': 'rgba(255, 255, 255, 0.6)',
        'app-muted-hi': 'rgba(255, 255, 255, 0.8)',
        'app-gold': '#FF9800',
        'app-gold-dim': '#c77a00',
        'app-success': '#4CAF50',
        'app-error': '#F44336',
        'app-blue': '#00D4FF',
        'app-eye':   '#6ee7b7',
        'app-sleep': '#a78bfa',
        'app-mind':  '#4FC3F7',
        'app-pink':  '#FF6B9D',
      },
    },
  },
  plugins: [],
};
