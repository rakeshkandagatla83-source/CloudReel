import type { Variants } from 'motion/react'

/**
 * Shared animation presets for the landing page.
 * Every section reuses these so motion stays consistent across the homepage.
 * All are transform/opacity only (GPU-friendly) and respect reduced motion
 * when a component gates them with `useReducedMotion()`.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Parent that staggers its children into view. */
export const revealContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
}

/** Standard "rise + fade" item — the default reveal for copy blocks and cards. */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
}

/** Container for headline lines (tighter stagger than the block-level one). */
export const lineContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

/** A single headline line — clip-reveals up from behind an overflow-hidden mask. */
export const lineReveal: Variants = {
  hidden: { y: '115%' },
  visible: {
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
}

/** Shared `whileInView` viewport config — fire once, slightly before fully in view. */
export const viewportOnce = { once: true, margin: '-12% 0px' } as const

/** Hover variants for cards */
export const hoverCard: Variants = {
  hover: {
    y: -4,
    scale: 1.01,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
}
