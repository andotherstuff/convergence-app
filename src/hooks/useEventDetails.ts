import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { API_BASE } from "@/lib/apiBase";
import { createNip98Token } from "@/lib/nip98Auth";

export interface ScheduleItem {
  /** Human-readable display string, e.g. "09:00–10:00". */
  time: string;
  /** Parsed start time in HH:MM (24-hour, Europe/Oslo). */
  start?: string;
  /** Parsed end time in HH:MM (24-hour, Europe/Oslo). */
  end?: string;
  event: string;
}

export interface ScheduleDay {
  day: string;
  /** ISO date (YYYY-MM-DD) the items fall on. */
  date?: string;
  subtitle: string;
  items: ScheduleItem[];
}

export interface EventDetailsData {
  signalGroupLink: string;
  schedule: ScheduleDay[];
  /** IANA timezone the schedule is expressed in. Defaults to Europe/Oslo. */
  timezone?: string;
  eventStart?: string;
  eventEnd?: string;
  location: {
    city: string;
    venueNote: string;
    exploreNote: string;
  };
}

/**
 * Sentinel error messages used to distinguish "user is not approved" from
 * other failures. Consumers check `error.message === 'NOT_APPROVED'` /
 * `'NOT_LOGGED_IN'` to render the appropriate UI.
 */
export const EVENT_DETAILS_ERRORS = {
  NOT_LOGGED_IN: "NOT_LOGGED_IN",
  NOT_APPROVED: "NOT_APPROVED",
} as const;

/**
 * Fetches the gated event details (schedule, Signal link, location) from
 * the shared Cloudflare Worker using NIP-98 HTTP Auth. The same endpoint
 * powers the website's `/event` page; the response is identical.
 *
 * Returns 403 when the signed-in pubkey is not on the worker's approved
 * attendee list (we surface this as the `NOT_APPROVED` error message).
 */
export function useEventDetails({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { user } = useCurrentUser();

  return useQuery<EventDetailsData>({
    queryKey: ["event-details", user?.pubkey],
    queryFn: async () => {
      if (!user) {
        throw new Error(EVENT_DETAILS_ERRORS.NOT_LOGGED_IN);
      }

      const url = `${API_BASE}/api/event`;
      const token = await createNip98Token(user, url, "GET");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Nostr ${token}`,
        },
      });

      if (response.status === 403) {
        throw new Error(EVENT_DETAILS_ERRORS.NOT_APPROVED);
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            "Failed to fetch event details",
        );
      }

      return response.json();
    },
    enabled: enabled && !!user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
