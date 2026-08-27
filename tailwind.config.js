/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────────────────────────
        "bg-primary": "#0F0F1A",
        "bg-card": "#1A1A2E",
        "bg-elevated": "#252542",
        "bg-input": "#13132A",

        // ── Accent ───────────────────────────────────────────────────────
        "accent-purple": "#8B5CF6",
        "accent-purple-light": "#A78BFA",
        "accent-blue": "#3B82F6",
        "accent-cyan": "#06B6D4",
        "accent-green": "#10B981",
        "accent-gold": "#F59E0B",
        "accent-red": "#EF4444",
        "accent-orange": "#F97316",

        // ── Text ─────────────────────────────────────────────────────────
        "text-primary": "#FFFFFF",
        "text-secondary": "#9CA3AF",
        "text-muted": "#6B7280",

        // ── Border ───────────────────────────────────────────────────────
        "border-subtle": "rgba(255,255,255,0.05)",
        "border-active": "rgba(255,255,255,0.1)",

        // ── App aliases (used via app-* className tokens) ────────────────
        "app-purple": "#8B5CF6",
        "app-purple-light": "#A78BFA",
        "app-gold": "#F59E0B",
        "app-muted": "#6B7280",
      },
      fontFamily: {
        heading: ["SpaceGrotesk_700Bold"],
        "heading-semi": ["SpaceGrotesk_600SemiBold"],
        "body-bold": ["Inter_700Bold"],
        "body-semi": ["Inter_600SemiBold"],
        body: ["Inter_400Regular"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "48px",
      },
    },
  },
  plugins: [],
};
