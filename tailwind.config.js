/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0A0E1A',
        'app-surface': '#0D1128',
        'app-card': 'rgba(255, 255, 255, 0.05)',
        'app-border': 'rgba(123, 97, 255, 0.3)',
        'app-border-hi': '#7B61FF',
        'app-purple': '#7B61FF',
        'app-purple-light': '#9d8aff',
        'app-purple-dim': 'rgba(123, 97, 255, 0.35)',
        'app-muted': 'rgba(255, 255, 255, 0.6)',
        'app-muted-hi': 'rgba(255, 255, 255, 0.8)',
        'app-gold': '#FF9800',
        'app-gold-dim': '#c77a00',
        'app-success': '#4CAF50',
        'app-error': '#F44336',
        'app-blue': '#4FC3F7',
      },
    },
  },
  plugins: [],
};
