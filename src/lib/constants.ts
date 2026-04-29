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
  // MK Fain — npub1jvnpg4c6ljadf5t6ry0w9q0rnm4mksde87kglkrc993z46c39axsgq89sc
  "932614571afcbad4d17a191ee281e39eebbb41b93fac8fd87829622aeb112f4d",
  // npub1pmwz736ys3mfhjdld4r36xqwfc5qkz7dwxdkmfu3qqd7kucvludsrm4nu6
  "0edc2f474484769bc9bf6d471d180e4e280b0bcd719b6da791001beb730cff1b",
  // npub1q3sle0kvfsehgsuexttt3ugjd8xdklxfwwkh559wxckmzddywnws6cd26p
  "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd",
  // npub1m9d23lqwl78y3z2jf9dcqeyer5nlh9hdsef0ztx7m3dyaz66u4qq4stysk
  "d95aa8fc0eff8e488952495b8064991d27fb96ed8652f12cdedc5a4e8b5ae540",
  // npub1wmr34t36fy03m8hvgl96zl3znndyzyaqhwmwdtshwmtkg03fetaqhjg240
  "76c71aae3a491f1d9eec47cba17e229cda4113a0bbb6e6ae1776d7643e29cafa",
  // npub12rv5lskctqxxs2c8rf2zlzc7xx3qpvzs3w4etgemauy9thegr43sf485vg
  "50d94fc2d8580c682b071a542f8b1e31a200b0508bab95a33bef0855df281d63",
  // npub1zuuajd7u3sx8xu92yav9jwxpr839cs0kc3q6t56vd5u9q033xmhsk6c2uc
  "1739d937dc8c0c7370aa27585938c119e25c41f6c441a5d34c6d38503e3136ef",
  // npub15l5atkgtzladdezjdnjc7zhej7uvzjpxaj7mctpe2hnwyk85qqxqjuecgm
  "a7e9d5d90b17fad6e4526ce58f0af997b8c14826ecbdbc2c3955e6e258f4000c",
];

/** Helper: is a pubkey in the organizer list? */
export function isOrganizer(pubkey: string): boolean {
  return AOS_ORGANIZERS.includes(pubkey);
}
