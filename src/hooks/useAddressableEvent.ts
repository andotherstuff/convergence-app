import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

export interface AddressableCoord {
  kind: number;
  pubkey: string;
  identifier: string;
}

/**
 * Fetch the latest addressable event (kind 30000-39999) for a given
 * (kind, pubkey, d-tag) coordinate.
 */
export function useAddressableEvent(coord: AddressableCoord | null) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent | null>({
    queryKey: [
      "addr-event",
      coord?.kind ?? null,
      coord?.pubkey ?? null,
      coord?.identifier ?? null,
    ],
    queryFn: async ({ signal }) => {
      if (!coord) return null;

      const events = await nostr.query(
        [
          {
            kinds: [coord.kind],
            authors: [coord.pubkey],
            "#d": [coord.identifier],
            limit: 1,
          },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      // Keep the latest version in case a relay returns multiple.
      return (
        events.sort((a, b) => b.created_at - a.created_at)[0] ?? null
      );
    },
    enabled: !!coord,
    staleTime: 60_000,
  });
}
