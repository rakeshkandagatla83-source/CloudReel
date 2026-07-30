/**
 * Shared guest roster for the hero broadcast mock and the multiviewer card,
 * so both sections show the same host + participants from one source of truth.
 */
export const GUEST_VIDEOS = [
  '/videos/guest1.mp4',
  '/videos/guest2.mp4',
  '/videos/guest3.mp4',
  '/videos/guest4.mp4',
  '/videos/guest5.mp4',
  '/videos/guest6.mp4',
]

export const GUEST_NAMES = [
  'Ashley Meyer (NYS)',
  'Gary McPherson (NYS)',
  'Josh Stiller (NYS)',
  'Sen. Kennedy (1960)',
  'VP Nixon (1960)',
  'H. K. Smith (Host)',
]

/** Index of the always-on host within GUEST_VIDEOS / GUEST_NAMES. */
export const HOST_INDEX = 5

/** Indices of the non-host participants available to fill layout slots. */
export const PARTICIPANT_POOL = [0, 1, 2, 3, 4]
