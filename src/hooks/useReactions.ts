import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { NKinds, type NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isValidReaction, resolveReactionEmoji } from "@/lib/customEmoji";

/**
 * Normalise a kind-7 reaction content to a display emoji.
 * Per NIP-25, '+' or '' means "like", '-' means "dislike".
 *
 * Note: this lower-level helper does not know about NIP-30 custom
 * emojis — `:shortcode:` content is passed through unchanged so it
 * serves as a stable group key. Use {@link resolveReactionEmoji} when
 * you also need the image URL.
 */
export function normalizeReactionEmoji(content: string): string {
  const c = content.trim();
  if (c === "" || c === "+") return "👍";
  if (c === "-") return "👎";
  return c;
}

export interface ReactionGroup {
  /**
   * The display emoji (already normalized). Doubles as the group key.
   * For custom emojis this is the `:shortcode:` form, with colons.
   */
  emoji: string;
  /** NIP-30 image URL when the group represents a custom emoji. */
  url?: string;
  /** NIP-30 shortcode name (without colons) when this is a custom emoji. */
  name?: string;
  /** Total count of this reaction. */
  count: number;
  /** Whether the current user has this reaction active. */
  mine: boolean;
  /** The current user's reaction event (needed to delete). */
  myEvent?: NostrEvent;
  /** Sample pubkeys that reacted with this emoji (for tooltips etc). */
  pubkeys: string[];
}

/**
 * Pure aggregator: given a set of kind-7 events and the current user's
 * pubkey (if any), produce sorted reaction groups. Extracted out of the
 * hook so the optimistic-update path and unit tests can reuse it.
 *
 * Rules:
 *  - Malformed reactions (custom-emoji `:shortcode:` content without a
 *    matching `["emoji", name, url]` tag) are dropped — see
 *    {@link isValidReaction}.
 *  - Latest reaction per pubkey wins (a user changing their reaction
 *    only counts once).
 *  - For each custom-emoji group, the URL from the *first* validated
 *    event observed is captured. Same-shortcode-different-URLs would
 *    visually collide otherwise.
 */
export function aggregateReactions(
  events: Iterable<NostrEvent>,
  viewerPubkey: string | null | undefined,
): ReactionGroup[] {
  // Drop malformed reactions before any further work.
  const valid: NostrEvent[] = [];
  for (const e of events) {
    if (isValidReaction(e)) valid.push(e);
  }

  // Keep only the latest reaction per pubkey.
  const latestPerPubkey = new Map<string, NostrEvent>();
  for (const e of valid) {
    const prev = latestPerPubkey.get(e.pubkey);
    if (!prev || e.created_at > prev.created_at) {
      latestPerPubkey.set(e.pubkey, e);
    }
  }

  const groups = new Map<string, ReactionGroup>();
  for (const e of latestPerPubkey.values()) {
    const resolved = resolveReactionEmoji(e);
    if (!resolved) continue;
    const key = resolved.content;
    let g = groups.get(key);
    if (!g) {
      g = {
        emoji: key,
        url: resolved.url,
        name: resolved.name,
        count: 0,
        mine: false,
        pubkeys: [],
      };
      groups.set(key, g);
    }
    // Backfill url/name if we now have a custom-emoji event for an
    // existing group key. First validated URL wins.
    if (!g.url && resolved.url) {
      g.url = resolved.url;
      g.name = resolved.name;
    }
    g.count += 1;
    g.pubkeys.push(e.pubkey);
    if (viewerPubkey && e.pubkey === viewerPubkey) {
      g.mine = true;
      g.myEvent = e;
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji),
  );
}

/**
 * Query kind-7 reactions for a given target (Nostr event).
 * Returns aggregated groups by emoji.
 */
export function useReactions(target: NostrEvent | null) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery<ReactionGroup[]>({
    queryKey: [
      "reactions",
      target?.id,
      // Re-run when login state changes so `mine` reflects the right user
      user?.pubkey ?? null,
    ],
    queryFn: async ({ signal }) => {
      if (!target) return [];

      const filter: {
        kinds: number[];
        limit: number;
        "#e"?: string[];
        "#a"?: string[];
      } = { kinds: [7], limit: 500 };

      // For addressable events, query both by event id and by coordinate —
      // reactions to a specific revision and to the replaceable coordinate
      // should both count.
      if (NKinds.addressable(target.kind)) {
        const d =
          target.tags.find(([n]) => n === "d")?.[1] ?? "";
        filter["#a"] = [`${target.kind}:${target.pubkey}:${d}`];
      } else {
        filter["#e"] = [target.id];
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      });

      return aggregateReactions(events, user?.pubkey ?? null);
    },
    enabled: !!target,
    staleTime: 30_000,
  });
}
