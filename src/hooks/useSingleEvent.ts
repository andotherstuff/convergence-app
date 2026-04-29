import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Fetch a single event by id. Optionally include an author pubkey to
 * make the query more selective against relays that support it.
 */
export function useSingleEvent(
  id: string | undefined,
  author?: string,
  kind?: number
) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent | null>({
    queryKey: ["event", id, author ?? null, kind ?? null],
    queryFn: async ({ signal }) => {
      if (!id) return null;

      const filter: {
        ids: string[];
        authors?: string[];
        kinds?: number[];
        limit: number;
      } = { ids: [id], limit: 1 };
      if (author) filter.authors = [author];
      if (typeof kind === "number") filter.kinds = [kind];

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      });

      return events[0] ?? null;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Fetch a conversation thread: the root event (by id) plus every
 * kind 1 reply that e-tags that id (directly or transitively).
 * Returns a flat, chronologically-sorted list of replies.
 */
export function useThreadReplies(rootId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent[]>({
    queryKey: ["thread-replies", rootId],
    queryFn: async ({ signal }) => {
      if (!rootId) return [];

      const events = await nostr.query(
        [{ kinds: [1], "#e": [rootId], limit: 500 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) }
      );

      // Dedupe and sort oldest-first (natural reading order for a thread).
      const seen = new Set<string>();
      const unique: NostrEvent[] = [];
      for (const e of events) {
        if (seen.has(e.id) || e.id === rootId) continue;
        seen.add(e.id);
        unique.push(e);
      }
      return unique.sort((a, b) => a.created_at - b.created_at);
    },
    enabled: !!rootId,
    staleTime: 15_000,
  });
}
