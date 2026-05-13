import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NKinds, type NostrEvent } from "@nostrify/nostrify";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  normalizeReactionEmoji,
  type ReactionGroup,
} from "@/hooks/useReactions";

/**
 * Input shape for a reaction. Either a string (native emoji, or `+` / `-` /
 * empty for the canonical "like" / "dislike" forms) or an object carrying
 * a NIP-30 custom emoji shortcode + image URL.
 */
export type ReactionInput =
  | string
  | { shortcode: string; url: string };

interface ReactParams {
  target: NostrEvent;
  /** The emoji the user clicked. See {@link ReactionInput}. */
  emoji: ReactionInput;
  /** If the user already has this reaction, its event id — used to delete. */
  existingId?: string;
}

function isCustomReactionInput(
  v: ReactionInput,
): v is { shortcode: string; url: string } {
  return typeof v === "object" && v !== null;
}

/**
 * Convert a {@link ReactionInput} into the string value used as the
 * group key in {@link ReactionGroup}. For native emojis this is the
 * normalized display form (👍 / 👎 / passthrough); for custom emojis
 * it's the colon-wrapped shortcode.
 */
function inputToDisplay(input: ReactionInput): string {
  if (isCustomReactionInput(input)) return `:${input.shortcode}:`;
  return normalizeReactionEmoji(input);
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

      // NIP-30: include the image URL via an `emoji` tag so other
      // clients can render the reaction. Without it the event is a
      // malformed custom-emoji reaction and will be filtered out by
      // `isValidReaction`.
      let content: string;
      if (isCustomReactionInput(emoji)) {
        content = `:${emoji.shortcode}:`;
        tags.push(["emoji", emoji.shortcode, emoji.url]);
      } else {
        content = emoji;
      }

      const event = await publish({
        kind: 7,
        content,
        tags,
      });

      return { action: "added" as const, event };
    },
    onMutate: async ({ target, emoji, existingId }) => {
      if (!user) return;
      const displayEmoji = inputToDisplay(emoji);
      const customUrl = isCustomReactionInput(emoji) ? emoji.url : undefined;
      const customName = isCustomReactionInput(emoji)
        ? emoji.shortcode
        : undefined;
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
            // Backfill url/name if this is the first custom-emoji
            // reaction in an otherwise-empty group.
            if (!next[idx].url && customUrl) {
              next[idx].url = customUrl;
              next[idx].name = customName;
            }
          } else {
            next.push({
              emoji: displayEmoji,
              url: customUrl,
              name: customName,
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
