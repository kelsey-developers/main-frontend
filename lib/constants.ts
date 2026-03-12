/**
 * Design system and app constants.
 * Centralizes brand colors and config for navbar, footer, and cards.
 */

/** Tailwind class for top padding so content starts just below the fixed Navbar.
 * Keep in sync with Navbar height (h-14 sm:h-16 in Navbar.tsx).
 * Currently uses pt-16 (4rem) to clear the nav on all breakpoints.
 */
export const LAYOUT_NAVBAR_OFFSET = 'pt-16';

/** Navbar height in px for sticky offsets (e.g. progress card top). Matches h-16 = 4rem = 64px. */
export const NAVBAR_HEIGHT_PX = 64;

/** Z-index stack for cleaning job detail: Navbar above progress, progress above checklist, footer above content. */
export const CLEANING_JOB_Z = {
  navbar: 50,
  progressCard: 30,
  stickyFooter: 40,
} as const;

export const BRAND = {
  teal: '#0B5858',
  tealHover: '#0d9488',
  yellow: '#FACC15',
  yellowCta: '#eab308',
} as const;

/** Role badge background colors (same as oop-dev) */
export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:       { bg: '#B84C4C', text: 'white' },
  agent:       { bg: '#FACC15', text: '#0B5858' },
  finance:     { bg: '#6366F1', text: 'white' },
  inventory:   { bg: '#0891B2', text: 'white' },
  housekeeping: { bg: '#059669', text: 'white' },
  user:        { bg: '#558B8B', text: 'white' },
  cleaner:     { bg: '#6366F1', text: 'white' },
};
