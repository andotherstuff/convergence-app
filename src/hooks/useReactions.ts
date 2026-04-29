import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { NKinds, type NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Normalise a kind-7 reaction content to a display emoji.
 * Per NIP-25, '+' or '' means "like", '-' means "dislike".
 */
export function normalizeReactionEmoji(content: string): string {
  const c = content.trim();
  if (c === "" || c === "+") return "👍";
  if (c === "-") return "👎";
  return c;
}

export interface ReactionGroup {
  /** The display emoji (already normalized). */
  emoji: string;
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

      // Group by normalized emoji, keeping the latest reaction per pubkey.
      const latestPerPubkey = new Map<string, NostrEvent>();
      for (const e of events) {
        const prev = latestPerPubkey.get(e.pubkey);
        if (!prev || e.created_at > prev.created_at) {
          latestPerPubkey.set(e.pubkey, e);
        }
      }

      const groups = new Map<string, ReactionGroup>();
      for (const e of latestPerPubkey.values()) {
        const emoji = normalizeReactionEmoji(e.content);
        let g = groups.get(emoji);
        if (!g) {
          g = { emoji, count: 0, mine: false, pubkeys: [] };
          groups.set(emoji, g);
        }
        g.count += 1;
        g.pubkeys.push(e.pubkey);
        if (user && e.pubkey === user.pubkey) {
          g.mine = true;
          g.myEvent = e;
        }
      }

      // Sort by count desc, then alphabetically for stability.
      return [...groups.values()].sort(
        (a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji)
      );
    },
    enabled: !!target,
    staleTime: 30_000,
  });
}
