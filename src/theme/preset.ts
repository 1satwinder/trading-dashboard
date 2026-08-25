import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * xtrading theme preset.
 *
 * We do NOT maintain a separate palette. Instead we customize PrimeVue's Aura
 * tokens so its built-in token system — and the Tailwind bridge
 * (`tailwindcss-primeui`) that reads from it — produces the brand defined in
 * docs/03-design-system.md. Domain-specific colors PrimeVue has no concept of
 * (price up/down) live in Tailwind's `@theme` instead (see main.css).
 */
export const XtradingPreset = definePreset(Aura, {
  semantic: {
    // Brand accent → indigo (#4F8CFF). Aura's dark scheme uses primary.400 as
    // the base color and primary.300 for hover, so 400 carries the accent.
    primary: {
      50: '#eef4ff',
      100: '#d9e7ff',
      200: '#bcd5ff',
      300: '#8fb8ff',
      400: '#4f8cff',
      500: '#2f6ef0',
      600: '#2557d6',
      700: '#1f45ad',
      800: '#1e3c88',
      900: '#1d356b',
      950: '#142244',
    },
    // A token can be defined per color scheme
    // using light and dark properties of the colorScheme property.
    colorScheme: {
      dark: {
        // Near-black surface ramp mapped to the design system so that Aura's
        // semantic references resolve to our colors:
        //   surface.950 → page background   (#0E1117, e.g. form fields)
        //   surface.900 → card/content bg    (#161B22)
        //   surface.700 → borders            (#262C36)
        //   surface.400 → muted text         (#8B949E)
        surface: {
          0: '#ffffff',
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d9dde3',
          300: '#b3bac5',
          400: '#8b949e',
          500: '#6b7480',
          600: '#4b535d',
          700: '#262c36',
          800: '#1c222c',
          900: '#161b22',
          950: '#0e1117',
        },
        // Soft white primary text (not pure #fff) per the design system.
        text: {
          color: '#e6edf3',
          hoverColor: '#e6edf3',
        },
      },
    },
  },
})
