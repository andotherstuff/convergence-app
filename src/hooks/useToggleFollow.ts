import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowList, type FollowList } from "@/hooks/useFollowList";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";

interface ToggleFollowParams {
  /** The pubkey to follow or unfollow. */
  target: string;
  /** If true, adds the follow; if false, removes it. */
  follow: boolean;
}

/**
 * Follow/unfollow a pubkey by republishing the current user's kind-3
 * event with the target added or removed. Preserves all non-`p` tags
 * and the existing `content` field (some clients stash relay JSON there).
 */
export function useToggleFollow() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { mutateAsync: publish } = useNostrPublish();
  const { data: ownFollowList } = useFollowList(user?.pubkey);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ target, follow }: ToggleFollowParams) => {
      if (!user) throw new Error("Must be logged in to follow");
      if (target === user.pubkey) throw new Error("Can't follow yourself");

      // Re-read the latest from relays in case our cache is stale — we
      // don't want to accidentally wipe follows added from another client.
      let current: NostrEvent | null = ownFollowList?.event ?? null;
      try {
        const fresh = await nostr.query(
          [{ kinds: [3], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(3000) }
        );
        const latest = fresh.sort((a, b) => b.created_at - a.created_at)[0];
        if (latest && (!current || latest.created_at > current.created_at)) {
          current = latest;
        }
      } catch {
        // Offline / timeout: keep using whatever we cached.
      }

      const existingTags = current?.tags ?? [];
      const existingContent = current?.content ?? "";

      // Split by tag type so we preserve everything that isn't a `p` tag.
      const pTags: string[][] = [];
      const otherTags: string[][] = [];
      for (const tag of existingTags) {
        if (tag[0] === "p") pTags.push(tag);
        else otherTags.push(tag);
      }

      let nextPTags: string[][];
      if (follow) {
        const already = pTags.some(([, pk]) => pk === target);
        if (already) {
          nextPTags = pTags;
        } else {
          nextPTags = [...pTags, ["p", target]];
        }
      } else {
        nextPTags = pTags.filter(([, pk]) => pk !== target);
      }

      const event = await publish({
        kind: 3,
        content: existingContent,
        tags: [...otherTags, ...nextPTags],
      });

      return event;
    },
    onMutate: async ({ target, follow }) => {
      if (!user) return;
      const key = ["follow-list", user.pubkey];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FollowList>(key);

      qc.setQueryData<FollowList>(key, (old) => {
        const base: FollowList = old ?? { following: [], event: null };
        if (follow) {
          if (base.following.includes(target)) return base;
          return { ...base, following: [...base.following, target] };
        }
        return {
          ...base,
          following: base.following.filter((pk) => pk !== target),
        };
      });

      // Also tweak the target's followers-list cache optimistically
      const followersKey = ["followers", target];
      const prevFollowers = qc.getQueryData<{ pubkeys: string[]; atCap: boolean }>(
        followersKey
      );
      qc.setQueryData<{ pubkeys: string[]; atCap: boolean }>(
        followersKey,
        (old) => {
          const base = old ?? { pubkeys: [], atCap: false };
          if (follow) {
            if (base.pubkeys.includes(user.pubkey)) return base;
            return { ...base, pubkeys: [...base.pubkeys, user.pubkey] };
          }
          return {
            ...base,
            pubkeys: base.pubkeys.filter((pk) => pk !== user.pubkey),
          };
        }
      );

      return { prev, prevFollowers, key, followersKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
      if (context?.prevFollowers)
        qc.setQueryData(context.followersKey, context.prevFollowers);
    },
    onSettled: (_d, _e, { target }) => {
      if (!user) return;
      qc.invalidateQueries({ queryKey: ["follow-list", user.pubkey] });
      qc.invalidateQueries({ queryKey: ["followers", target] });
    },
  });
}
