import type { Config } from 'tailwindcss';

/**
 * Los colores salen de los tokens del portal original (src/styles/tokens.css),
 * que están declarados como canales «R G B» sueltos. Envolverlos en rgb(...)
 * permite además aplicarles opacidad con la sintaxis `bg-primary/10`.
 *
 * Los nombres replican los de los tokens: no se inventan alias.
 */
const channel = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  // El portal alterna el tema con la clase .dark en <html>.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: channel('--color-primary'),
        brand: channel('--color-brand'),
        secondary: channel('--color-secondary'),
        accent: channel('--color-accent'),
        'accent-sky': channel('--color-accent-sky'),
        'accent-violet': channel('--color-accent-violet'),
        'accent-peach': channel('--color-accent-peach'),
        success: channel('--color-success'),
        warning: channel('--color-warning'),
        danger: channel('--color-danger'),

        // Superficies y paneles
        panel: channel('--color-panel-fill'),
        'panel-border': channel('--color-panel-border'),
        'panel-header': channel('--color-panel-header-bg'),
        'panel-header-text': channel('--color-panel-header-text'),
        container: channel('--color-surface-container-bg'),
        'container-border': channel('--color-surface-container-border'),

        // Formularios
        input: channel('--color-input-bg'),
        'input-border': channel('--color-input-border'),
        label: channel('--color-label-text'),

        // Texto
        'text-main': channel('--color-bi-text-main'),
        'text-muted': channel('--color-bi-text-muted'),

        // Pestañas
        'tab-bar': channel('--color-tab-bar-bg'),
        'tab-inactive': channel('--color-tab-inactive-bg'),
        'tab-inactive-text': channel('--color-tab-inactive-text'),
      },
      borderRadius: {
        base: 'var(--radius-base)',
        panel: 'var(--radius-panel)',
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
      },
    },
  },
  plugins: [],
} satisfies Config;
