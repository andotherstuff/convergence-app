import { describe, expect, it } from "vitest";
import type { NostrEvent } from "@nostrify/nostrify";
import { getClientTag, isForeignClient } from "@/lib/clientTag";

function ev(tags: string[][]): NostrEvent {
  return {
    id: "x",
    pubkey: "y",
    created_at: 0,
    kind: 1,
    tags,
    content: "",
    sig: "z",
  };
}

describe("getClientTag", () => {
  it("returns null when the event has no client tag", () => {
    expect(getClientTag(ev([["t", "foo"]]))).toBeNull();
  });

  it("returns the value when a client tag is present", () => {
    expect(getClientTag(ev([["client", "damus"]]))).toBe("damus");
  });

  it("trims surrounding whitespace", () => {
    expect(getClientTag(ev([["client", "  damus  "]]))).toBe("damus");
  });

  it("returns null for an empty / whitespace value", () => {
    expect(getClientTag(ev([["client", "   "]]))).toBeNull();
    expect(getClientTag(ev([["client", ""]]))).toBeNull();
  });
});

describe("isForeignClient", () => {
  it("is false for null (no tag)", () => {
    expect(isForeignClient(null)).toBe(false);
  });

  it("is false for the canonical app id", () => {
    expect(isForeignClient("aos-convergence.app")).toBe(false);
  });

  it("is false for the legacy app id", () => {
    expect(isForeignClient("aos-convergence")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isForeignClient("AOS-Convergence")).toBe(false);
    expect(isForeignClient("AOS-Convergence.App")).toBe(false);
  });

  it("is true for any other client name", () => {
    expect(isForeignClient("damus")).toBe(true);
    expect(isForeignClient("primal.net")).toBe(true);
    expect(isForeignClient("nostrudel.ninja")).toBe(true);
  });
});
