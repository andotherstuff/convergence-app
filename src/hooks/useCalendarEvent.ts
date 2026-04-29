import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

interface CalendarEventCoords {
  kind: number;
  pubkey: string;
  identifier: string;
}

/**
 * Fetch a specific addressable calendar event (kind 31922 or 31923).
 * Filters by author to prevent spoofing of the d-tag.
 */
export function useCalendarEvent(coords: CalendarEventCoords) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent | null>({
    queryKey: [
      "calendar-event",
      coords.kind,
      coords.pubkey,
      coords.identifier,
    ],
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [
          {
            kinds: [coords.kind],
            authors: [coords.pubkey],
            "#d": [coords.identifier],
            limit: 1,
          },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      // Validate required tags per NIP-52
      const event = events[0];
      if (!event) return null;

      const hasTitle = event.tags.some(([n]) => n === "title");
      const hasStart = event.tags.some(([n]) => n === "start");
      if (!hasTitle || !hasStart) return null;

      return event;
    },
    staleTime: 5 * 60_000,
  });
}
