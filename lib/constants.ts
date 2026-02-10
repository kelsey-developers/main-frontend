/**
 * Design system and app constants.
 * Centralizes brand colors and config for navbar, footer, and cards.
 */

/** Tailwind class for top padding so content starts just below the fixed Navbar.
 * Keep in sync with Navbar height (h-14 sm:h-16 in Navbar.tsx).
 * Currently uses pt-16 (4rem) to clear the nav on all breakpoints.
 */
export const LAYOUT_NAVBAR_OFFSET = 'pt-16';

export const BRAND = {
  teal: '#0B5858',
  tealHover: '#0d9488',
  yellow: '#FACC15',
  yellowCta: '#eab308',
} as const;

/** Role badge background colors (same as oop-dev) */
export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: '#B84C4C', text: 'white' },
  agent: { bg: '#FACC15', text: '#0B5858' },
  user: { bg: '#558B8B', text: 'white' },
};
