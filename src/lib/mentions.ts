import { nip19 } from "nostr-tools";

/**
 * Extract the pubkeys mentioned in a post's content. Used at publish
 * time to derive the `p` tags that notify mentioned users.
 *
 * Recognizes:
 *  - `nostr:npub1…` URIs (the standard NIP-21 form the composer inserts)
 *  - `nostr:nprofile1…` URIs (carries the pubkey + optional relay hints)
 *  - bare `npub1…` / `nprofile1…` mentions, with or without a leading `@`
 *
 * Duplicates are de-duplicated. Order matches first appearance in the
 * content (stable for snapshot tests).
 */
export function extractMentionedPubkeys(content: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  // The NoteContent renderer's regex inspired this pattern; we match the
  // same shapes so anything that linkifies as a mention also becomes a
  // `p` tag.
  const regex =
    /(?:nostr:|@)?(npub1|nprofile1)([023456789acdefghjklmnpqrstuvwxyz]+)/gi;

  for (const match of content.matchAll(regex)) {
    const prefix = match[1].toLowerCase();
    const data = match[2].toLowerCase();
    const encoded = `${prefix}${data}`;
    try {
      const decoded = nip19.decode(encoded);
      let pubkey: string | null = null;
      if (decoded.type === "npub") {
        pubkey = decoded.data as string;
      } else if (decoded.type === "nprofile") {
        pubkey = (decoded.data as { pubkey: string }).pubkey;
      }
      if (!pubkey) continue;
      if (seen.has(pubkey)) continue;
      seen.add(pubkey);
      out.push(pubkey);
    } catch {
      // Invalid NIP-19 encoding — skip silently. The user will see the
      // raw string in their post and can fix it.
    }
  }

  return out;
}

/**
 * Build the `p`-tag entries to add to an outgoing event for the given
 * pubkeys, deduplicated and excluding any pubkeys the caller wants to
 * skip (e.g. the author's own pubkey, or pubkeys already covered by
 * separate logic like NIP-10 reply tags).
 */
export function buildMentionTags(
  pubkeys: string[],
  exclude: Iterable<string> = [],
): string[][] {
  const skip = new Set(exclude);
  const out: string[][] = [];
  const added = new Set<string>();
  for (const pk of pubkeys) {
    if (skip.has(pk) || added.has(pk)) continue;
    added.add(pk);
    out.push(["p", pk]);
  }
  return out;
}
