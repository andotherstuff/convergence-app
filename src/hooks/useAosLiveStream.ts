import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNostr } from "@nostrify/react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NostrEvent, NostrFilter } from "@nostrify/nostrify";
import {
  AOS_HASHTAG,
  ANNOUNCEMENT_TAG,
  AOS_ORGANIZERS,
  PROJECT_KIND,
} from "@/lib/constants";
import { isAnnouncement, type FeedMode } from "./useAosFeed";

/**
 * Returns true if an event should appear in the top-level community
 * feed in the given mode. Mirrors the filtering rules inside
 * `useAosFeed`'s `queryFn` so live events match what the paged feed
 * would surface.
 */
function shouldInclude(event: NostrEvent, mode: FeedMode): boolean {
  if (mode === "announcements") {
    return isAnnouncement(event);
  }

  // 'all' mode: kind-1 notes and kind-PROJECT_KIND project submissions
  // tagged #aosconvergence. Drop kind-1 replies (any kind-1 carrying an
  // "e" tag is a NIP-10 reply and belongs in a thread view, not the
  // top-level feed).
  const hasAosTag = event.tags.some(
    ([n, v]) => n === "t" && v?.toLowerCase() === AOS_HASHTAG
  );
  if (!hasAosTag) return false;

  if (event.kind === 1) {
    if (event.tags.some(([n]) => n === "e")) return false;
    return true;
  }
  if (event.kind === PROJECT_KIND) {
    return true;
  }
  return false;
}

/**
 * Live-streaming subscription for the AOS Convergence feed.
 *
 * Opens a long-lived `nostr.req(...)` subscription with `since = now`
 * and buffers incoming events into `pending`. The UI can surface a
 * "N new posts" banner; calling `flush()` prepends the buffered events
 * into the `['aos-feed', mode]` query cache so they become visible in
 * the feed, then clears the buffer.
 *
 * We do NOT auto-inject events into the feed because doing so while
 * the user is reading causes the scroll position to jump. The banner
 * pattern lets the user opt in when they're ready.
 */
export function useAosLiveStream(mode: FeedMode) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  // Pending events keyed by id to dedupe cheaply.
  const [pendingMap, setPendingMap] = useState<Map<string, NostrEvent>>(
    () => new Map()
  );

  // We capture `now` once per mount of the subscription so a single
  // subscription streams continuously from when it was opened. A ref
  // lets the effect re-read the latest value without retriggering.
  const startedAtRef = useRef<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    // Reset when mode flips.
    setPendingMap(new Map());
    startedAtRef.current = Math.floor(Date.now() / 1000);

    let cancelled = false;
    const abort = new AbortController();

    const filters: NostrFilter[] =
      mode === "announcements"
        ? [
            {
              kinds: [1],
              authors: [...AOS_ORGANIZERS],
              "#t": [ANNOUNCEMENT_TAG],
              since: startedAtRef.current,
            },
          ]
        : [
            {
              kinds: [1],
              "#t": [AOS_HASHTAG],
              since: startedAtRef.current,
            },
            {
              kinds: [PROJECT_KIND],
              "#t": [AOS_HASHTAG],
              since: startedAtRef.current,
            },
          ];

    const subscription = nostr.req(filters, { signal: abort.signal });

    (async () => {
      try {
        for await (const msg of subscription) {
          if (cancelled) break;
          if (msg[0] !== "EVENT") continue;
          const event = msg[2];
          if (!shouldInclude(event, mode)) continue;

          // Skip if the event is already present in the paged feed
          // cache — otherwise the banner count would lie.
          const cached = queryClient.getQueryData<InfiniteData<NostrEvent[]>>([
            "aos-feed",
            mode,
          ]);
          const alreadyInFeed = cached?.pages.some((page) =>
            page.some((e) => e.id === event.id)
          );
          if (alreadyInFeed) continue;

          setPendingMap((prev) => {
            if (prev.has(event.id)) return prev;
            const next = new Map(prev);
            next.set(event.id, event);
            return next;
          });
        }
      } catch (err) {
        // Subscription aborted or relay hiccup — silently stop. A
        // full remount (e.g. navigating away and back) will re-open.
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.debug("[useAosLiveStream] subscription ended:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [mode, nostr, queryClient]);

  const pending = useMemo(() => {
    return [...pendingMap.values()].sort(
      (a, b) => b.created_at - a.created_at
    );
  }, [pendingMap]);

  const flush = useCallback(() => {
    if (pendingMap.size === 0) return;

    // Snapshot, then clear the buffer up-front so late arrivals during
    // the cache update still accumulate for the next flush.
    const toInject = [...pendingMap.values()];
    setPendingMap(new Map());

    queryClient.setQueryData<InfiniteData<NostrEvent[]>>(
      ["aos-feed", mode],
      (old) => {
        if (!old) {
          return {
            pages: [
              toInject.sort((a, b) => b.created_at - a.created_at),
            ],
            pageParams: [undefined],
          };
        }

        // Merge into page 0 (newest page). Dedupe by id across all
        // pages so an event that already snuck in via refetch isn't
        // double-added. For addressable events, keep only the latest
        // per pubkey+d coordinate.
        const seenIds = new Set<string>();
        for (const page of old.pages) {
          for (const e of page) seenIds.add(e.id);
        }

        const latestAddr = new Map<string, NostrEvent>();
        for (const page of old.pages) {
          for (const e of page) {
            if (e.kind === PROJECT_KIND) {
              const d = e.tags.find(([n]) => n === "d")?.[1] ?? "";
              const key = `${e.pubkey}:${d}`;
              const prev = latestAddr.get(key);
              if (!prev || e.created_at > prev.created_at) {
                latestAddr.set(key, e);
              }
            }
          }
        }

        const fresh: NostrEvent[] = [];
        for (const e of toInject) {
          if (seenIds.has(e.id)) continue;
          if (e.kind === PROJECT_KIND) {
            const d = e.tags.find(([n]) => n === "d")?.[1] ?? "";
            const key = `${e.pubkey}:${d}`;
            const prev = latestAddr.get(key);
            if (prev && prev.created_at >= e.created_at) continue;
            latestAddr.set(key, e);
          }
          seenIds.add(e.id);
          fresh.push(e);
        }

        if (fresh.length === 0) return old;

        const nextPages = [...old.pages];
        const firstPage = nextPages[0] ?? [];
        // Drop any older replaceable entries for the same coord that
        // got superseded by a freshly-received project update.
        const supersededCoords = new Set(
          fresh
            .filter((e) => e.kind === PROJECT_KIND)
            .map(
              (e) =>
                `${e.pubkey}:${e.tags.find(([n]) => n === "d")?.[1] ?? ""}`
            )
        );
        const purgedFirst = firstPage.filter((e) => {
          if (e.kind !== PROJECT_KIND) return true;
          const key = `${e.pubkey}:${e.tags.find(([n]) => n === "d")?.[1] ?? ""}`;
          if (!supersededCoords.has(key)) return true;
          // Keep only if this cached event is newer (shouldn't happen
          // because we filtered above, but defensive).
          const incoming = fresh.find(
            (f) =>
              f.kind === PROJECT_KIND &&
              `${f.pubkey}:${f.tags.find(([n]) => n === "d")?.[1] ?? ""}` ===
                key
          );
          return incoming ? incoming.created_at < e.created_at : true;
        });

        nextPages[0] = [...fresh, ...purgedFirst].sort(
          (a, b) => b.created_at - a.created_at
        );

        return { ...old, pages: nextPages };
      }
    );
  }, [mode, pendingMap, queryClient]);

  return { pending, pendingCount: pending.length, flush };
}
