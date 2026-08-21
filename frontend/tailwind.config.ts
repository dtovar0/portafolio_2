import type { Config } from 'tailwindcss';

/**
 * Los colores salen de las variables CSS de `tokens.css`, heredadas del
 * portal Flask, para que ambos frontends se vean igual durante la transición.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--nx-surface) / <alpha-value>)',
        panel: 'rgb(var(--nx-panel) / <alpha-value>)',
        border: 'rgb(var(--nx-border) / <alpha-value>)',
        content: 'rgb(var(--nx-content) / <alpha-value>)',
        muted: 'rgb(var(--nx-muted) / <alpha-value>)',
        accent: 'rgb(var(--nx-accent) / <alpha-value>)',
      },
      borderRadius: { card: '0.75rem' },
    },
  },
  plugins: [],
} satisfies Config;
