import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";
import { AOS_HASHTAG, PROJECT_KIND } from "@/lib/constants";

export type ActivityKind = "all" | "posts" | "projects" | "comments";

/**
 * Query a single pubkey's AOS Convergence-related activity:
 * their kind-1 posts, kind-38459 project submissions, and kind-1111
 * comments — all tagged #aosconvergence.
 */
export function useAuthorAosActivity(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent[]>({
    queryKey: ["author-aos-activity", pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) return [];

      type Filter = {
        kinds: number[];
        authors: string[];
        "#t": string[];
        limit: number;
      };
      const make = (kinds: number[]): Filter => ({
        kinds,
        authors: [pubkey],
        "#t": [AOS_HASHTAG],
        limit: 200,
      });

      const events = await nostr.query(
        [make([1]), make([PROJECT_KIND]), make([1111])],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) }
      );

      // Dedupe by id
      const seen = new Set<string>();
      const deduped: NostrEvent[] = [];
      for (const e of events) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        deduped.push(e);
      }

      // For addressable events, keep the latest per d-tag
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
    enabled: !!pubkey,
    staleTime: 30_000,
  });
}

export function filterActivity(
  events: NostrEvent[],
  kind: ActivityKind
): NostrEvent[] {
  switch (kind) {
    case "posts":
      return events.filter((e) => e.kind === 1);
    case "projects":
      return events.filter((e) => e.kind === PROJECT_KIND);
    case "comments":
      return events.filter((e) => e.kind === 1111);
    default:
      return events;
  }
}
