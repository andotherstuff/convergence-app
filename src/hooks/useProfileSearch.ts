import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type NostrEvent, type NostrMetadata, NSchema as n } from "@nostrify/nostrify";
import { useNostr } from "@nostrify/react";
import { genUserName } from "@/lib/genUserName";

export interface ProfileCandidate {
  pubkey: string;
  name: string;
  displayName: string;
  nip05?: string;
  picture?: string;
}

/**
 * Build a list of `{ pubkey → metadata }` from every kind-0 event that
 * React Query's `useAuthor` has already cached. That cache is hydrated
 * naturally by the feed/thread/profile views the user has visited, so
 * by the time they're composing a post the cache is a strong proxy for
 * "people the user is likely to want to mention."
 */
function harvestCachedProfiles(qc: ReturnType<typeof useQueryClient>): ProfileCandidate[] {
  const all = qc.getQueriesData<{ event?: NostrEvent; metadata?: NostrMetadata }>(
    { queryKey: ["nostr", "author"] },
  );
  const out: ProfileCandidate[] = [];
  const seen = new Set<string>();
  for (const [key, data] of all) {
    if (!data) continue;
    const pubkey = (key as unknown[])[2] as string | undefined;
    if (!pubkey || seen.has(pubkey)) continue;
    seen.add(pubkey);
    const md = data.metadata;
    const name =
      (md?.name || md?.display_name || "").toString().trim() ||
      genUserName(pubkey);
    out.push({
      pubkey,
      name,
      displayName: (md?.display_name || md?.name || genUserName(pubkey)).toString().trim(),
      nip05: md?.nip05,
      picture: md?.picture,
    });
  }
  return out;
}

/**
 * Top up the local pool with kind-0 events from relays for pubkeys
 * recently seen in feeds. Runs once on mount, debounced; failures are
 * silent — the cached pool is enough to make autocomplete useful.
 */
async function topUpFromRelays(
  qc: ReturnType<typeof useQueryClient>,
  query: ReturnType<typeof useNostr>["nostr"],
  pubkeys: string[],
): Promise<void> {
  if (pubkeys.length === 0) return;
  try {
    const events = await query.query(
      [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
      { signal: AbortSignal.timeout(2500) },
    );
    for (const event of events) {
      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        qc.setQueryData(["nostr", "author", event.pubkey], {
          event,
          metadata,
        });
      } catch {
        // Skip events with unparseable metadata.
      }
    }
  } catch {
    // Silent: cached pool is the primary source.
  }
}

/**
 * Lightweight search across cached kind-0 profile metadata for the
 * `@mention` autocomplete in the composer.
 *
 * Strategy:
 *  - Collect every profile React Query has already cached (via
 *    `useAuthor`). This is the bulk of the pool — feeds, threads, and
 *    profile views all warm it.
 *  - Optionally seed with a `seedPubkeys` list: pubkeys observed in the
 *    current feed view, even if their profile metadata hasn't been
 *    explicitly fetched yet. The hook fires off a one-time top-up
 *    relay query for those pubkeys on mount so subsequent searches
 *    can match them by name.
 *  - Filter by name / display_name / nip05 prefix match, case
 *    insensitive. Returns up to `limit` candidates (default 6).
 *
 * No effort is made to globally search Nostr for arbitrary names —
 * that requires NIP-50 support on relays and would be overkill for
 * an event-scoped composer.
 */
export function useProfileSearch(options: {
  query: string;
  seedPubkeys?: string[];
  limit?: number;
}): ProfileCandidate[] {
  const { query: rawQuery, seedPubkeys = [], limit = 6 } = options;
  const qc = useQueryClient();
  const { nostr } = useNostr();
  // Re-render whenever the cache is updated so newly-fetched profiles
  // surface in the dropdown without the user having to retype.
  const [cacheTick, setCacheTick] = useState(0);

  // One-time top-up for seeded pubkeys not already cached.
  useEffect(() => {
    if (seedPubkeys.length === 0) return;
    const missing = seedPubkeys.filter(
      (pk) => !qc.getQueryData(["nostr", "author", pk]),
    );
    if (missing.length === 0) return;
    void topUpFromRelays(qc, nostr, missing).then(() => {
      setCacheTick((t) => t + 1);
    });
    // Intentionally fire once per unique seed set; ignore identity
    // changes from re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPubkeys.join(",")]);

  return useMemo(() => {
    const query = rawQuery.trim().toLowerCase();
    if (query.length === 0) return [];

    const candidates = harvestCachedProfiles(qc);

    // Score: prefer prefix matches on display_name → name → nip05.
    const matches: { c: ProfileCandidate; score: number }[] = [];
    for (const c of candidates) {
      const haystacks = [
        c.displayName?.toLowerCase() ?? "",
        c.name.toLowerCase(),
        (c.nip05 ?? "").toLowerCase().replace(/^_@/, ""),
      ];
      let bestScore = Number.POSITIVE_INFINITY;
      for (let i = 0; i < haystacks.length; i++) {
        const h = haystacks[i];
        if (!h) continue;
        if (h.startsWith(query)) {
          bestScore = Math.min(bestScore, i * 10 + 0);
        } else if (h.includes(query)) {
          bestScore = Math.min(bestScore, i * 10 + 5);
        }
      }
      if (bestScore < Number.POSITIVE_INFINITY) {
        matches.push({ c, score: bestScore });
      }
    }

    matches.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.c.name.localeCompare(b.c.name);
    });

    return matches.slice(0, limit).map((m) => m.c);
    // qc is stable; cacheTick forces re-evaluation after top-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery, limit, cacheTick]);
}
