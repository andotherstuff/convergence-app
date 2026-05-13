import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

type EventTemplate = Pick<NostrEvent, "kind" | "content"> &
  Partial<Pick<NostrEvent, "tags" | "created_at">>;

/**
 * Canonical client identifier stamped onto every event this app
 * publishes. Hostname-style value so other Nostr clients can recognize
 * the source at a glance and so the feed's "via X" badge logic can use
 * a single canonical string. Kept here (rather than read from
 * `location.hostname`) so dev / staging / preview deploys emit the same
 * stable identifier as production.
 *
 * If you ever rename the public deployment, update this constant and
 * also update `SELF_CLIENT_IDS` in `src/lib/clientTag.ts` so old events
 * stay recognized as native.
 */
export const CLIENT_TAG_VALUE = "aos-convergence.app";

export function useNostrPublish(): UseMutationResult<
  NostrEvent,
  Error,
  EventTemplate
> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (t: EventTemplate) => {
      if (user) {
        const tags = t.tags ?? [];

        // Stamp the client tag if the caller hasn't supplied one. This
        // runs in every environment (no protocol check) so events
        // published from dev / staging / production all carry the same
        // canonical identifier.
        if (!tags.some(([name]) => name === "client")) {
          tags.push(["client", CLIENT_TAG_VALUE]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}
