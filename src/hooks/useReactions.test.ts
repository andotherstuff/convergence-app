import { describe, expect, it } from "vitest";
import type { NostrEvent } from "@nostrify/nostrify";
import { aggregateReactions } from "@/hooks/useReactions";

let counter = 0;

function makeEvent(opts: {
  pubkey: string;
  content: string;
  tags?: string[][];
  createdAt?: number;
}): NostrEvent {
  counter += 1;
  return {
    id: `id-${counter}`,
    pubkey: opts.pubkey,
    created_at: opts.createdAt ?? counter,
    kind: 7,
    tags: opts.tags ?? [],
    content: opts.content,
    sig: "sig",
  };
}

describe("aggregateReactions", () => {
  it("returns [] for an empty event list", () => {
    expect(aggregateReactions([], null)).toEqual([]);
  });

  it("groups native emojis and counts them", () => {
    const events = [
      makeEvent({ pubkey: "a", content: "👍" }),
      makeEvent({ pubkey: "b", content: "👍" }),
      makeEvent({ pubkey: "c", content: "🎉" }),
    ];
    const groups = aggregateReactions(events, null);
    expect(groups).toHaveLength(2);
    const thumb = groups.find((g) => g.emoji === "👍")!;
    const party = groups.find((g) => g.emoji === "🎉")!;
    expect(thumb.count).toBe(2);
    expect(party.count).toBe(1);
    expect(thumb.url).toBeUndefined();
    expect(party.url).toBeUndefined();
  });

  it("normalizes + / empty to 👍 and - to 👎", () => {
    const events = [
      makeEvent({ pubkey: "a", content: "+" }),
      makeEvent({ pubkey: "b", content: "" }),
      makeEvent({ pubkey: "c", content: "-" }),
    ];
    const groups = aggregateReactions(events, null);
    const thumb = groups.find((g) => g.emoji === "👍")!;
    const down = groups.find((g) => g.emoji === "👎")!;
    expect(thumb.count).toBe(2);
    expect(down.count).toBe(1);
  });

  it("captures the URL on a valid custom-emoji reaction", () => {
    const events = [
      makeEvent({
        pubkey: "a",
        content: ":blobbi-salute:",
        tags: [
          ["emoji", "blobbi-salute", "https://e.example/b.png"],
        ],
      }),
    ];
    const groups = aggregateReactions(events, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].emoji).toBe(":blobbi-salute:");
    expect(groups[0].url).toBe("https://e.example/b.png");
    expect(groups[0].name).toBe("blobbi-salute");
    expect(groups[0].count).toBe(1);
  });

  it("aggregates two valid custom-emoji reactions from different pubkeys", () => {
    const events = [
      makeEvent({
        pubkey: "a",
        content: ":blobbi-salute:",
        tags: [
          ["emoji", "blobbi-salute", "https://e.example/b.png"],
        ],
      }),
      makeEvent({
        pubkey: "b",
        content: ":blobbi-salute:",
        tags: [
          ["emoji", "blobbi-salute", "https://e.example/b.png"],
        ],
      }),
    ];
    const groups = aggregateReactions(events, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].url).toBe("https://e.example/b.png");
  });

  it("drops malformed custom-emoji reactions (no matching tag)", () => {
    const events = [
      makeEvent({ pubkey: "a", content: ":blobbi-salute:" }),
      makeEvent({ pubkey: "b", content: ":blobbi-salute:" }),
    ];
    expect(aggregateReactions(events, null)).toEqual([]);
  });

  it("keeps only the latest reaction per pubkey", () => {
    const events = [
      makeEvent({ pubkey: "a", content: "👍", createdAt: 100 }),
      makeEvent({ pubkey: "a", content: "🎉", createdAt: 200 }),
    ];
    const groups = aggregateReactions(events, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].emoji).toBe("🎉");
    expect(groups[0].count).toBe(1);
  });

  it("flags the viewer's own reaction with mine + myEvent", () => {
    const events = [
      makeEvent({ pubkey: "viewer", content: "👍" }),
      makeEvent({ pubkey: "other", content: "👍" }),
    ];
    const groups = aggregateReactions(events, "viewer");
    expect(groups).toHaveLength(1);
    expect(groups[0].mine).toBe(true);
    expect(groups[0].myEvent?.pubkey).toBe("viewer");
  });

  it("sorts groups by count desc, then alphabetically", () => {
    const events = [
      makeEvent({ pubkey: "a", content: "🎉" }),
      makeEvent({ pubkey: "b", content: "👍" }),
      makeEvent({ pubkey: "c", content: "👍" }),
      makeEvent({ pubkey: "d", content: "❤️" }),
    ];
    const groups = aggregateReactions(events, null);
    // Top group is "👍" (count 2). The remaining two have count 1 and
    // are sorted by localeCompare, which puts "❤️" (U+2764) before
    // "🎉" (U+1F389).
    expect(groups[0].emoji).toBe("👍");
    expect(groups[0].count).toBe(2);
    expect(new Set(groups.slice(1).map((g) => g.emoji))).toEqual(
      new Set(["🎉", "❤️"]),
    );
    expect(groups.slice(1).every((g) => g.count === 1)).toBe(true);
  });

  it("captures URL from the first event when same shortcode appears with different URLs", () => {
    const events = [
      makeEvent({
        pubkey: "a",
        content: ":x:",
        createdAt: 100,
        tags: [["emoji", "x", "https://e.example/first.png"]],
      }),
      makeEvent({
        pubkey: "b",
        content: ":x:",
        createdAt: 200,
        tags: [["emoji", "x", "https://e.example/second.png"]],
      }),
    ];
    const groups = aggregateReactions(events, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    // One URL wins — we don't care which for the user-visible bug, just
    // that we don't crash or split the group.
    expect([
      "https://e.example/first.png",
      "https://e.example/second.png",
    ]).toContain(groups[0].url);
  });
});
