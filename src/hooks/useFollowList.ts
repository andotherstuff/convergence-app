import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

export interface FollowList {
  following: string[];
  /** The raw kind-3 event, if found. Used when republishing. */
  event: NostrEvent | null;
}

/**
 * Fetch a user's kind-3 follow list. Returns the list of followed
 * pubkeys (in the order they appear in the event's `p` tags).
 */
export function useFollowList(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<FollowList>({
    queryKey: ["follow-list", pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) return { following: [], event: null };

      const events = await nostr.query(
        [{ kinds: [3], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) }
      );

      // Keep only the newest (relays should already do this for replaceable kinds)
      const event =
        events.sort((a, b) => b.created_at - a.created_at)[0] ?? null;

      if (!event) return { following: [], event: null };

      const following = event.tags
        .filter(
          ([name, value]) =>
            name === "p" && typeof value === "string" && /^[0-9a-f]{64}$/i.test(value)
        )
        .map(([, value]) => value);

      return { following, event };
    },
    enabled: !!pubkey,
    staleTime: 30_000,
  });
}
