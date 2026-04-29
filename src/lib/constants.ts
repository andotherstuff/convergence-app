/**
 * App-wide constants for AOS Convergence.
 */

/** The hashtag used to filter kind 1 notes and tag projects (lowercase per Nostr convention). */
export const AOS_HASHTAG = "aosconvergence";

/** Display version of the hashtag. */
export const AOS_HASHTAG_DISPLAY = "#AOSConvergence";

/** Tag value used to mark a post as an official announcement. */
export const ANNOUNCEMENT_TAG = "announcement";

/** Custom event kind for project showcase submissions (addressable). */
export const PROJECT_KIND = 38459;

/**
 * Hex pubkeys of members of the AOS Convergence organizing team.
 * Only posts authored by these pubkeys qualify as announcements.
 * Append hex pubkeys (not npubs) here as the team grows.
 */
export const AOS_ORGANIZERS: readonly string[] = [
  // MK Fain
  "932614571afcbad4d17a191ee281e39eebbb41b93fac8fd87829622aeb112f4d",
];

/** Helper: is a pubkey in the organizer list? */
export function isOrganizer(pubkey: string): boolean {
  return AOS_ORGANIZERS.includes(pubkey);
}
