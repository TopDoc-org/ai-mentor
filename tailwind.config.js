/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0b0d12",
          850: "#10131a",
          800: "#161a23",
          700: "#1f2530",
          600: "#2b3240",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#9b83ff",
          glow: "#6d4dff",
        },
        gold: "#e8b64c",
        flame: "#ff7a45",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
        heading: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        hand: ['Caveat', 'ui-rounded', 'cursive'],
        marker: ['"Permanent Marker"', 'Comic Sans MS', 'cursive'],
        brand: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '800' }],
        'display-lg': ['3rem', { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'heading-xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65', letterSpacing: '0', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.45', letterSpacing: '0.01em', fontWeight: '500' }],
        'micro': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '600' }],
        'stat': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      letterSpacing: {
        'display': '-0.04em',
        'tight': '-0.025em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(124,92,255,0.45)",
        card: "0 8px 40px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(124,92,255,0.35)" },
          "50%": { boxShadow: "0 0 28px 6px rgba(124,92,255,0.25)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        pop: "pop 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
