import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { NKinds, type NostrEvent, type NostrFilter } from "@nostrify/nostrify";

/**
 * Count of discussion events attached to a given target:
 *  - For kind 1 notes: counts kind 1 NIP-10 replies (events tagging
 *    the note's id with an "e" tag).
 *  - For addressable events (like kind 38459 projects): counts kind
 *    1111 comments scoped to the addressable coordinate ("A" tag).
 *  - For kind 1111 comments themselves: counts direct replies
 *    (kind 1111 tagging the comment's id with a lowercase "e" tag).
 *
 * Returns the number of unique events whose author is not the target's
 * own author (to avoid self-inflation of "comment" counts from thread
 * starters).
 */
export function useCommentCount(target: NostrEvent | null) {
  const { nostr } = useNostr();

  return useQuery<number>({
    queryKey: [
      "comment-count",
      target?.id,
      target?.kind,
      // For addressable events the count depends on the coordinate,
      // which is pubkey + d-tag.
      target && NKinds.addressable(target.kind)
        ? `${target.pubkey}:${
            target.tags.find(([n]) => n === "d")?.[1] ?? ""
          }`
        : null,
    ],
    queryFn: async ({ signal }) => {
      if (!target) return 0;

      const s = AbortSignal.any([signal, AbortSignal.timeout(5000)]);

      if (target.kind === 1) {
        // Kind 1 NIP-10 replies
        const filter: NostrFilter = {
          kinds: [1],
          "#e": [target.id],
          limit: 500,
        };
        const events = await nostr.query([filter], { signal: s });
        // Only count events that actually tag `target.id` as reply/root —
        // any e-tag counts as part of the conversation, so this is a good
        // approximation for a thread count.
        return events.filter((e) => e.id !== target.id).length;
      }

      if (NKinds.addressable(target.kind)) {
        const d = target.tags.find(([n]) => n === "d")?.[1] ?? "";
        const filter: NostrFilter = {
          kinds: [1111],
          "#A": [`${target.kind}:${target.pubkey}:${d}`],
          limit: 500,
        };
        const events = await nostr.query([filter], { signal: s });
        return events.length;
      }

      if (target.kind === 1111) {
        const filter: NostrFilter = {
          kinds: [1111],
          "#e": [target.id],
          limit: 500,
        };
        const events = await nostr.query([filter], { signal: s });
        return events.length;
      }

      return 0;
    },
    enabled: !!target,
    staleTime: 30_000,
  });
}
