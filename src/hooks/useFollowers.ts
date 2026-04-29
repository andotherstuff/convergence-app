import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";

const CAP = 1000;

export interface FollowersResult {
  /** Unique follower pubkeys. Latest kind-3 per pubkey only. */
  pubkeys: string[];
  /** True if we hit the query cap — the real count may be higher. */
  atCap: boolean;
}

/**
 * Query users who follow a given pubkey. Fetches kind-3 events that
 * reference the target in their `p` tags, and keeps only the latest
 * per author (so an outdated follow list doesn't count).
 */
export function useFollowers(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<FollowersResult>({
    queryKey: ["followers", pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) return { pubkeys: [], atCap: false };

      const events = await nostr.query(
        [{ kinds: [3], "#p": [pubkey], limit: CAP }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) }
      );

      // Keep only the latest kind-3 per author. If their newest list no
      // longer includes our target, they don't count as a current follower.
      const latestPerPubkey = new Map<string, (typeof events)[number]>();
      for (const e of events) {
        const prev = latestPerPubkey.get(e.pubkey);
        if (!prev || e.created_at > prev.created_at) {
          latestPerPubkey.set(e.pubkey, e);
        }
      }

      const followers: string[] = [];
      for (const e of latestPerPubkey.values()) {
        const stillFollows = e.tags.some(
          ([name, value]) => name === "p" && value === pubkey
        );
        if (stillFollows) followers.push(e.pubkey);
      }

      return {
        pubkeys: followers,
        atCap: events.length >= CAP,
      };
    },
    enabled: !!pubkey,
    staleTime: 60_000,
  });
}
