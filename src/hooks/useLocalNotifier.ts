import { useEffect, useRef } from "react";
import { useNostr } from "@nostrify/react";
import { useQueryClient } from "@tanstack/react-query";
import type { NostrEvent, NostrFilter, NostrMetadata } from "@nostrify/nostrify";
import { NSchema as n } from "@nostrify/nostrify";
import { nip19 } from "nostr-tools";
import {
  AOS_HASHTAG,
  ANNOUNCEMENT_TAG,
  AOS_ORGANIZERS,
  PROJECT_KIND,
} from "@/lib/constants";
import { isAnnouncement } from "./useAosFeed";
import { useCurrentUser } from "./useCurrentUser";
import { useNotificationPermission } from "./useNotificationPermission";
import {
  hasAnyCategoryEnabled,
  useNotificationPreferences,
  type NotificationPreferences,
} from "./useNotificationPreferences";
import { genUserName } from "@/lib/genUserName";

/** Max notifications per rolling 10s window; overflow is batched. */
const BURST_LIMIT = 3;
const BURST_WINDOW_MS = 10_000;
/** Debounce window in which multiple incoming events are batched into one. */
const BATCH_DEBOUNCE_MS = 1500;
/** Drop events older than this relative to subscription start (seconds). */
const MAX_EVENT_AGE_SECONDS = 60;

type Category = "posts" | "projects" | "announcements";

/**
 * Decide which category (if any) a given event falls into. Returns
 * null if the event doesn't qualify for any category.
 */
function categorize(event: NostrEvent): Category | null {
  // Announcements take priority over "posts" — an organizer announcement
  // IS a kind-1 note, but we want it classified as an announcement so
  // the corresponding user toggle applies.
  if (isAnnouncement(event)) return "announcements";

  const hasAos = event.tags.some(
    ([name, value]) => name === "t" && value?.toLowerCase() === AOS_HASHTAG
  );
  if (!hasAos) return null;

  if (event.kind === PROJECT_KIND) return "projects";

  if (event.kind === 1) {
    // Drop NIP-10 replies — same logic as the main feed.
    if (event.tags.some(([name]) => name === "e")) return null;
    return "posts";
  }

  return null;
}

function isCategoryEnabled(
  cat: Category,
  prefs: NotificationPreferences
): boolean {
  if (!prefs.enabled) return false;
  return prefs[cat];
}

/**
 * Resolve the author display name for a pubkey using whatever kind-0
 * profile we already have cached via `useAuthor` / `useLoggedInAccounts`.
 * Falls back to `genUserName(pubkey)` if nothing is cached — we never
 * block a notification on a profile fetch.
 */
function resolveAuthorName(
  pubkey: string,
  queryClient: ReturnType<typeof useQueryClient>
): string {
  // `useAuthor` queries under `['author', pubkey]` — peek at the cache.
  const cached = queryClient.getQueryData<{
    metadata?: NostrMetadata;
    event?: NostrEvent;
  }>(["author", pubkey]);

  const metaName = cached?.metadata?.name;
  if (metaName) return metaName;

  const display = cached?.metadata?.display_name;
  if (display) return display;

  // Last fallback: kind-0 content that might be cached elsewhere
  if (cached?.event?.content) {
    try {
      const parsed = n.json().pipe(n.metadata()).parse(cached.event.content);
      if (parsed.name) return parsed.name;
      if (parsed.display_name) return parsed.display_name;
    } catch {
      /* ignore */
    }
  }

  return genUserName(pubkey);
}

/**
 * Build a link path for an event. Kind 1 → `nevent`; addressable
 * PROJECT_KIND → `naddr`.
 */
function eventPath(event: NostrEvent): string {
  if (event.kind === PROJECT_KIND) {
    const d = event.tags.find(([name]) => name === "d")?.[1] ?? "";
    try {
      const naddr = nip19.naddrEncode({
        pubkey: event.pubkey,
        kind: event.kind,
        identifier: d,
      });
      return `/projects/${naddr}`;
    } catch {
      /* fall through */
    }
  }
  try {
    const nevent = nip19.neventEncode({
      id: event.id,
      author: event.pubkey,
      kind: event.kind,
    });
    return `/${nevent}`;
  } catch {
    return "/";
  }
}

interface NotificationCopy {
  title: string;
  body: string;
}

function buildCopy(
  event: NostrEvent,
  category: Category,
  authorName: string
): NotificationCopy {
  const content = (event.content ?? "").trim().replace(/\s+/g, " ");
  const snippet = content.length > 140 ? content.slice(0, 137) + "…" : content;

  switch (category) {
    case "announcements":
      return {
        title: `📣 Announcement from ${authorName}`,
        body: snippet || "Open AOS Convergence to read",
      };
    case "projects": {
      const title =
        event.tags.find(([name]) => name === "title")?.[1] ??
        event.tags.find(([name]) => name === "name")?.[1] ??
        "a new project";
      return {
        title: `🚀 ${authorName} shared a project`,
        body: title,
      };
    }
    case "posts":
    default:
      return {
        title: `${authorName} posted`,
        body: snippet || "Open AOS Convergence to read",
      };
  }
}

/**
 * Global hook that listens for live Nostr events matching the user's
 * notification preferences and fires a system notification for each.
 *
 * Intended to be mounted exactly once near the root of the app (see
 * `NotificationBridge`).
 *
 * Important caveats this hook intentionally enforces:
 *  - only runs when permission is "granted" AND at least one category
 *    is enabled in prefs;
 *  - silently no-ops when the page is visible (the user is already
 *    looking at the feed — the in-page "new posts" banner handles it);
 *  - dedupes by event id across the full session;
 *  - batches bursts (if multiple events arrive within
 *    BATCH_DEBOUNCE_MS, they collapse into one "N new posts"
 *    notification);
 *  - caps at BURST_LIMIT notifications per BURST_WINDOW_MS (any
 *    overflow is coalesced).
 */
export function useLocalNotifier() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { prefs } = useNotificationPreferences();
  const { isGranted } = useNotificationPermission();

  // Persist a few things across re-renders without re-triggering
  // effects.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<NostrEvent[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const recentNotifStampsRef = useRef<number[]>([]);
  const prefsRef = useRef(prefs);
  const userPubkeyRef = useRef<string | undefined>(user?.pubkey);

  // Keep refs in sync with latest values without resubscribing.
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);
  useEffect(() => {
    userPubkeyRef.current = user?.pubkey;
  }, [user?.pubkey]);

  const active = isGranted && hasAnyCategoryEnabled(prefs);

  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const startedAt = Math.floor(Date.now() / 1000);
    const abort = new AbortController();

    const flush = () => {
      debounceTimerRef.current = null;
      const batch = pendingRef.current;
      pendingRef.current = [];
      if (batch.length === 0) return;

      // Drop events that fall outside currently-enabled categories —
      // prefs may have changed while the debounce timer was running.
      const allowed = batch.filter((e) => {
        const cat = categorize(e);
        return cat ? isCategoryEnabled(cat, prefsRef.current) : false;
      });
      if (allowed.length === 0) return;

      // Rate limit (burst guard).
      const now = Date.now();
      recentNotifStampsRef.current = recentNotifStampsRef.current.filter(
        (t) => now - t < BURST_WINDOW_MS
      );
      if (recentNotifStampsRef.current.length >= BURST_LIMIT) {
        // Over the limit — coalesce everything into a single summary
        // notification, but still count it against the budget.
        try {
          const n = new Notification("AOS Convergence", {
            body: `${allowed.length} new updates`,
            icon: "/AOS_Official.svg",
            badge: "/AOS_Official.svg",
            tag: "aos-summary",
            renotify: true,
            data: { path: "/" },
          });
          n.onclick = () => {
            window.focus();
            n.close();
            const target = `${window.location.origin}/`;
            if (window.location.href !== target) {
              window.location.href = target;
            }
          };
          recentNotifStampsRef.current.push(now);
        } catch {
          /* ignore */
        }
        return;
      }

      if (allowed.length === 1) {
        // Single event — rich per-event notification.
        const event = allowed[0];
        const category = categorize(event)!;
        const authorName = resolveAuthorName(event.pubkey, queryClient);
        const { title, body } = buildCopy(event, category, authorName);
        const path = eventPath(event);
        try {
          const notif = new Notification(title, {
            body,
            icon: "/AOS_Official.svg",
            badge: "/AOS_Official.svg",
            tag: `aos-${event.id}`,
            data: { path, eventId: event.id },
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
            const full = `${window.location.origin}${path}`;
            if (window.location.href !== full) {
              window.location.href = full;
            }
          };
          recentNotifStampsRef.current.push(now);
        } catch {
          /* ignore */
        }
      } else {
        // Multiple events — summary notification.
        const announcementCount = allowed.filter(
          (e) => categorize(e) === "announcements"
        ).length;
        const summaryTitle =
          announcementCount > 0
            ? "📣 New AOS Convergence updates"
            : "New AOS Convergence posts";
        try {
          const notif = new Notification(summaryTitle, {
            body: `${allowed.length} new updates — tap to view`,
            icon: "/AOS_Official.svg",
            badge: "/AOS_Official.svg",
            tag: "aos-summary",
            renotify: true,
            data: { path: "/" },
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
            const target = `${window.location.origin}/`;
            if (window.location.href !== target) {
              window.location.href = target;
            }
          };
          recentNotifStampsRef.current.push(now);
        } catch {
          /* ignore */
        }
      }
    };

    const scheduleFlush = () => {
      if (debounceTimerRef.current != null) return;
      debounceTimerRef.current = window.setTimeout(
        flush,
        BATCH_DEBOUNCE_MS
      );
    };

    // Multi-filter subscription covering every category the user
    // could be interested in. We filter in-JS per event based on
    // current prefs at the moment it arrives.
    const filters: NostrFilter[] = [
      {
        kinds: [1],
        "#t": [AOS_HASHTAG],
        since: startedAt,
      },
      {
        kinds: [PROJECT_KIND],
        "#t": [AOS_HASHTAG],
        since: startedAt,
      },
      {
        kinds: [1],
        authors: [...AOS_ORGANIZERS],
        "#t": [ANNOUNCEMENT_TAG],
        since: startedAt,
      },
    ];

    const subscription = nostr.req(filters, { signal: abort.signal });

    (async () => {
      try {
        for await (const msg of subscription) {
          if (abort.signal.aborted) break;
          if (msg[0] !== "EVENT") continue;
          const event = msg[2];

          // Dedupe.
          if (seenIdsRef.current.has(event.id)) continue;
          seenIdsRef.current.add(event.id);

          // Skip own posts — no need to notify yourself about what you
          // just published.
          if (event.pubkey === userPubkeyRef.current) continue;

          // Skip events that predate the subscription (relay may send
          // some just-before-now matches).
          if (event.created_at < startedAt - MAX_EVENT_AGE_SECONDS) continue;

          const category = categorize(event);
          if (!category) continue;
          if (!isCategoryEnabled(category, prefsRef.current)) continue;

          // Skip when the user is already looking at the tab — the
          // "new posts" banner handles in-app awareness.
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "visible"
          ) {
            continue;
          }

          pendingRef.current.push(event);
          scheduleFlush();
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          // eslint-disable-next-line no-console
          console.debug("[useLocalNotifier] subscription ended:", err);
        }
      }
    })();

    // Periodically prune the seen-id set so memory doesn't grow
    // unbounded during very long sessions. Keep the last 5k ids.
    const pruneInterval = window.setInterval(() => {
      if (seenIdsRef.current.size > 5000) {
        const arr = [...seenIdsRef.current];
        seenIdsRef.current = new Set(arr.slice(-2500));
      }
    }, 60_000);

    return () => {
      abort.abort();
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingRef.current = [];
      window.clearInterval(pruneInterval);
    };
  }, [active, nostr, queryClient]);
}
