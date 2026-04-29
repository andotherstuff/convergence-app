import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NKinds, type NostrEvent } from "@nostrify/nostrify";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  normalizeReactionEmoji,
  type ReactionGroup,
} from "@/hooks/useReactions";

interface ReactParams {
  target: NostrEvent;
  /** The display emoji the user clicked. Pass '+' for a like. */
  emoji: string;
  /** If the user already has this reaction, its event id — used to delete. */
  existingId?: string;
}

/**
 * Toggle a kind-7 reaction on a target event.
 * - If the user has not reacted with this emoji, publish a new kind 7.
 * - If they have, publish a NIP-09 (kind 5) deletion request targeting the old reaction.
 * Also optimistically updates the `useReactions` query cache.
 */
export function useReact() {
  const { mutateAsync: publish } = useNostrPublish();
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ target, emoji, existingId }: ReactParams) => {
      if (!user) throw new Error("Must be logged in to react");

      if (existingId) {
        // Toggle off by publishing a deletion request. Clients that honor
        // NIP-09 will hide the old reaction.
        await publish({
          kind: 5,
          content: "",
          tags: [
            ["e", existingId],
            ["k", "7"],
          ],
        });
        return { action: "removed" as const };
      }

      // Build tags per NIP-25
      const tags: string[][] = [];
      if (NKinds.addressable(target.kind)) {
        const d = target.tags.find(([n]) => n === "d")?.[1] ?? "";
        tags.push(["a", `${target.kind}:${target.pubkey}:${d}`]);
      }
      tags.push(["e", target.id]);
      tags.push(["p", target.pubkey]);
      tags.push(["k", target.kind.toString()]);

      const event = await publish({
        kind: 7,
        content: emoji,
        tags,
      });

      return { action: "added" as const, event };
    },
    onMutate: async ({ target, emoji, existingId }) => {
      if (!user) return;
      const displayEmoji = normalizeReactionEmoji(emoji);
      const key = ["reactions", target.id, user.pubkey];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ReactionGroup[]>(key);

      // Optimistic update
      qc.setQueryData<ReactionGroup[]>(key, (groups) => {
        const next = (groups ?? []).map((g) => ({ ...g, pubkeys: [...g.pubkeys] }));

        if (existingId) {
          // Remove the user's reaction from the matching group
          const idx = next.findIndex((g) => g.emoji === displayEmoji);
          if (idx !== -1) {
            const g = next[idx];
            g.count = Math.max(0, g.count - 1);
            g.mine = false;
            g.myEvent = undefined;
            g.pubkeys = g.pubkeys.filter((pk) => pk !== user.pubkey);
            if (g.count === 0) next.splice(idx, 1);
          }
        } else {
          // Add the user's reaction
          const idx = next.findIndex((g) => g.emoji === displayEmoji);
          if (idx !== -1) {
            next[idx].count += 1;
            next[idx].mine = true;
            next[idx].pubkeys.push(user.pubkey);
          } else {
            next.push({
              emoji: displayEmoji,
              count: 1,
              mine: true,
              pubkeys: [user.pubkey],
            });
          }
        }

        return next.sort(
          (a, b) =>
            b.count - a.count || a.emoji.localeCompare(b.emoji)
        );
      });

      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(context.key, context.prev);
      }
    },
    onSettled: (_data, _err, { target }) => {
      // Revalidate from relays in the background
      qc.invalidateQueries({
        queryKey: ["reactions", target.id],
      });
    },
  });
}
