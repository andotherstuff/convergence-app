/**
 * App-wide constants for AOS Convergence.
 */

/** The hashtag used to filter kind 1 notes and tag projects (lowercase per Nostr convention). */
export const AOS_HASHTAG = "aosconvergence";

/** Display version of the hashtag. */
export const AOS_HASHTAG_DISPLAY = "#AOSConvergence";

/** Custom event kind for project showcase submissions (addressable). */
export const PROJECT_KIND = 38459;

/**
 * The canonical AOS Convergence calendar event (kind 31922, NIP-52).
 * Source: naddr1qvzqqqrukgpzqhfezurfd9u0ya8crwznfhwv7lxuukjupf5m4y06h8cw2smtf2a3qq4kzmmn943k7mnkv4exwetwvdjj6tfddaekcmedxgcryd3dxymnwde58qcr2df4xserwtfsmdrdmr
 */
export const AOS_SCHEDULE_EVENT = {
  kind: 31922,
  pubkey: "5d39170696978f274f81b8534ddccf7cdce5a5c0a69ba91fab9f0e5436b4abb1",
  identifier: "aos-convergence---oslo-2026-1777480555427-0",
} as const;
