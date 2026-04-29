import { nip19 } from "nostr-tools";
import type { NostrEvent } from "@nostrify/nostrify";
import { PROJECT_KIND } from "./constants";

/** Canonical Project shape extracted from a kind 38459 event. */
export interface Project {
  event: NostrEvent;
  id: string;
  pubkey: string;
  d: string;
  title: string;
  summary: string;
  description: string;
  url: string;
  repo: string;
  /** 4:3 landscape hero image shown on cards and the detail page header. */
  cover: string;
  /** Optional app screenshots of any size, shown below the description. */
  screenshots: string[];
  createdAt: number;
  naddr: string;
}

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getAllTagValues(event: NostrEvent, name: string): string[] {
  return event.tags
    .filter(([n]) => n === name)
    .map(([, v]) => v)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * Validate that an event has all required fields to be a valid Project,
 * returning a parsed Project or null.
 */
export function parseProject(event: NostrEvent): Project | null {
  if (event.kind !== PROJECT_KIND) return null;

  const d = getTag(event, "d");
  const title = getTag(event, "title");
  const url = getTag(event, "url");
  const repo = getTag(event, "repo");
  let cover = getTag(event, "cover");
  const screenshots = getAllTagValues(event, "image");
  const description = event.content?.trim() ?? "";

  if (!d || !title || !url || !repo || !description) {
    return null;
  }

  // Only accept http(s) URLs to limit injection surface
  const isSafeUrl = (u: string) => /^https?:\/\//i.test(u);
  if (!isSafeUrl(url) || !isSafeUrl(repo)) return null;

  // Backward-compat: older submissions used the first `image` tag as the
  // cover. If no explicit `cover` tag is present, promote the first
  // screenshot.
  if (!cover || !isSafeUrl(cover)) {
    const firstImage = screenshots.find(isSafeUrl);
    if (!firstImage) return null;
    cover = firstImage;
  }

  const safeScreenshots = screenshots
    .filter(isSafeUrl)
    .filter((u) => u !== cover);

  const summary = getTag(event, "summary") ?? description.slice(0, 160);

  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier: d,
  });

  return {
    event,
    id: event.id,
    pubkey: event.pubkey,
    d,
    title,
    summary,
    description,
    url,
    repo,
    cover,
    screenshots: safeScreenshots,
    createdAt: event.created_at,
    naddr,
  };
}
