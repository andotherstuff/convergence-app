import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Identifiers this app stamps on events it publishes. Used to decide
 * whether a rendered event came from this app (no badge shown) or from
 * a different Nostr client (small "via X" chip shown in the header).
 *
 * The canonical current value is `aos-convergence.app` (hostname form,
 * stamped by `useNostrPublish`). The legacy value `aos-convergence` is
 * still recognized so older project events that were published with the
 * shorter string don't get incorrectly flagged as "foreign."
 */
export const SELF_CLIENT_IDS: ReadonlySet<string> = new Set([
  "aos-convergence",
  "aos-convergence.app",
]);

/**
 * Return the value of the first `client` tag on the event, or `null` if
 * none is present. Empty / whitespace-only values are normalized to null.
 */
export function getClientTag(event: NostrEvent): string | null {
  const tag = event.tags.find(([n]) => n === "client");
  if (!tag) return null;
  const value = tag[1]?.trim();
  return value ? value : null;
}

/**
 * True iff the event's `client` tag identifies a client *other than*
 * this app. Events with no `client` tag at all return false — we only
 * badge posts that explicitly self-identify, to avoid annotating the
 * large fraction of Nostr events that simply omit the tag.
 *
 * Comparison is case-insensitive against {@link SELF_CLIENT_IDS}.
 */
export function isForeignClient(value: string | null): boolean {
  if (!value) return false;
  return !SELF_CLIENT_IDS.has(value.toLowerCase());
}
