import { useInfiniteQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

const PAGE_SIZE = 20;

/**
 * Infinite scroll feed of kind 1 notes tagged with a specific hashtag.
 * `tag` should be lowercase (per Nostr 't' tag convention).
 */
export function useHashtagFeed(tag: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery<NostrEvent[]>({
    queryKey: ["feed", "hashtag", tag],
    queryFn: async ({ pageParam, signal }) => {
      const filter: {
        kinds: number[];
        "#t": string[];
        limit: number;
        until?: number;
      } = {
        kinds: [1],
        "#t": [tag],
        limit: PAGE_SIZE,
      };

      if (typeof pageParam === "number") {
        filter.until = pageParam;
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      });

      // Sort newest first
      return [...events].sort((a, b) => b.created_at - a.created_at);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last.created_at - 1;
    },
    staleTime: 30_000,
  });
}
