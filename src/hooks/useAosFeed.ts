import { useInfiniteQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";
import {
  AOS_HASHTAG,
  ANNOUNCEMENT_TAG,
  AOS_ORGANIZERS,
  PROJECT_KIND,
} from "@/lib/constants";

// (We still reference PROJECT_KIND in the 'all' feed to surface project
// submissions alongside notes.)

const PAGE_SIZE = 25;

/** Return true if `event` qualifies as an organizer announcement. */
export function isAnnouncement(event: NostrEvent): boolean {
  if (event.kind !== 1) return false;
  if (!AOS_ORGANIZERS.includes(event.pubkey)) return false;
  const tags = event.tags;
  const hasAos = tags.some(
    ([n, v]) => n === "t" && v?.toLowerCase() === AOS_HASHTAG
  );
  const hasAnn = tags.some(
    ([n, v]) => n === "t" && v?.toLowerCase() === ANNOUNCEMENT_TAG
  );
  return hasAos && hasAnn;
}

export type FeedMode = "all" | "announcements";

/**
 * Main AOS Convergence feed — merges kind 1 notes and kind 38459
 * project submissions tagged #aosconvergence into a single newest-
 * first stream with infinite scroll. Comments (kind 1111) and
 * NIP-10 replies are intentionally excluded from the top-level feed;
 * they appear inside each item's thread view instead.
 *
 * mode:
 *   'all'            → everything
 *   'announcements'  → only kind-1 notes by organizers tagged
 *                      #aosconvergence + #announcement
 */
export function useAosFeed(mode: FeedMode = "all") {
  const { nostr } = useNostr();

  return useInfiniteQuery<NostrEvent[]>({
    queryKey: ["aos-feed", mode],
    queryFn: async ({ pageParam, signal }) => {
      const until = typeof pageParam === "number" ? pageParam : undefined;

      if (mode === "announcements") {
        // Organizer-authored kind 1 tagged with #announcement (narrower
        // query; we refine client-side for the #aosconvergence tag).
        const filter: {
          kinds: number[];
          authors: string[];
          "#t": string[];
          limit: number;
          until?: number;
        } = {
          kinds: [1],
          authors: [...AOS_ORGANIZERS],
          "#t": [ANNOUNCEMENT_TAG],
          limit: PAGE_SIZE,
        };
        if (until) filter.until = until;

        const events = await nostr.query([filter], {
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        });

        return events
          .filter(isAnnouncement)
          .sort((a, b) => b.created_at - a.created_at);
      }

      // 'all' mode — three parallel filters in one multi-filter query.
      type Filter = {
        kinds: number[];
        "#t": string[];
        limit: number;
        until?: number;
      };
      const makeFilter = (kinds: number[]): Filter => {
        const f: Filter = {
          kinds,
          "#t": [AOS_HASHTAG],
          limit: PAGE_SIZE,
        };
        if (until) f.until = until;
        return f;
      };

      const events = await nostr.query(
        [makeFilter([1]), makeFilter([PROJECT_KIND])],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) }
      );

      // Dedupe by id and drop replies — kind 1 notes that carry an "e"
      // tag are NIP-10 replies, which belong inside a thread view, not
      // the top-level feed.
      const seen = new Set<string>();
      const deduped: NostrEvent[] = [];
      for (const e of events) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        if (e.kind === 1 && e.tags.some(([n]) => n === "e")) continue;
        deduped.push(e);
      }

      // For addressable events, keep only the latest per pubkey+d
      const latestAddr = new Map<string, NostrEvent>();
      const rest: NostrEvent[] = [];
      for (const e of deduped) {
        if (e.kind === PROJECT_KIND) {
          const d = e.tags.find(([n]) => n === "d")?.[1] ?? "";
          const coord = `${e.pubkey}:${d}`;
          const prev = latestAddr.get(coord);
          if (!prev || e.created_at > prev.created_at) {
            latestAddr.set(coord, e);
          }
        } else {
          rest.push(e);
        }
      }

      return [...rest, ...latestAddr.values()].sort(
        (a, b) => b.created_at - a.created_at
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      // Use the oldest event's timestamp. Subtract 1 because `until` is inclusive.
      const oldest = lastPage.reduce(
        (min, e) => (e.created_at < min ? e.created_at : min),
        lastPage[0].created_at
      );
      return oldest - 1;
    },
    staleTime: 15_000,
  });
}
