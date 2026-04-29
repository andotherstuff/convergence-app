import { useInfiniteQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

const PAGE_SIZE = 25;

/**
 * Generic hashtag feed — infinite scroll of kind-1 notes tagged with
 * the given `t` value. Tag must be lowercase per Nostr convention.
 */
export function useHashtagFeed(tag: string) {
  const { nostr } = useNostr();
  const lower = tag.toLowerCase();

  return useInfiniteQuery<NostrEvent[]>({
    queryKey: ["hashtag-feed", lower],
    queryFn: async ({ pageParam, signal }) => {
      const until = typeof pageParam === "number" ? pageParam : undefined;
      const filter: {
        kinds: number[];
        "#t": string[];
        limit: number;
        until?: number;
      } = {
        kinds: [1],
        "#t": [lower],
        limit: PAGE_SIZE,
      };
      if (until) filter.until = until;

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      });

      return [...events].sort((a, b) => b.created_at - a.created_at);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    staleTime: 15_000,
    enabled: !!lower,
  });
}
