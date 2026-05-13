import { describe, expect, it } from "vitest";
import type { NostrEvent } from "@nostrify/nostrify";
import {
  buildEmojiMap,
  getCustomEmojiUrl,
  isCustomEmoji,
  isValidReaction,
  resolveReactionEmoji,
} from "@/lib/customEmoji";

function reaction(content: string, tags: string[][] = []): NostrEvent {
  return {
    id: "x",
    pubkey: "y",
    created_at: 0,
    kind: 7,
    tags,
    content,
    sig: "z",
  };
}

describe("isCustomEmoji", () => {
  it("matches a colon-wrapped shortcode", () => {
    expect(isCustomEmoji(":blobbi-salute:")).toBe(true);
    expect(isCustomEmoji(":party_parrot:")).toBe(true);
    expect(isCustomEmoji(":a:")).toBe(true);
  });

  it("rejects native emoji and non-shortcode strings", () => {
    expect(isCustomEmoji("👍")).toBe(false);
    expect(isCustomEmoji("+")).toBe(false);
    expect(isCustomEmoji("")).toBe(false);
    expect(isCustomEmoji(":missing-close")).toBe(false);
    expect(isCustomEmoji("nope:colons:nope")).toBe(false);
  });

  it("does not match shortcodes embedded in prose", () => {
    expect(isCustomEmoji("hello :wave: friend")).toBe(false);
  });
});

describe("getCustomEmojiUrl", () => {
  it("returns the URL for a matching emoji tag", () => {
    const tags = [["emoji", "blobbi-salute", "https://e.example/b.png"]];
    expect(getCustomEmojiUrl(":blobbi-salute:", tags)).toBe(
      "https://e.example/b.png",
    );
  });

  it("returns undefined when no tag matches", () => {
    const tags = [["emoji", "other", "https://e.example/o.png"]];
    expect(getCustomEmojiUrl(":blobbi-salute:", tags)).toBeUndefined();
  });

  it("picks the right URL when multiple emoji tags are present", () => {
    const tags = [
      ["emoji", "a", "https://e.example/a.png"],
      ["emoji", "b", "https://e.example/b.png"],
      ["emoji", "c", "https://e.example/c.png"],
    ];
    expect(getCustomEmojiUrl(":b:", tags)).toBe("https://e.example/b.png");
  });
});

describe("buildEmojiMap", () => {
  it("returns an empty map when no emoji tags are present", () => {
    expect(buildEmojiMap([["t", "foo"]]).size).toBe(0);
  });

  it("collects every shortcode → URL pair", () => {
    const map = buildEmojiMap([
      ["emoji", "a", "https://e.example/a.png"],
      ["t", "irrelevant"],
      ["emoji", "b", "https://e.example/b.png"],
    ]);
    expect(map.size).toBe(2);
    expect(map.get("a")).toBe("https://e.example/a.png");
    expect(map.get("b")).toBe("https://e.example/b.png");
  });

  it("ignores emoji tags without a URL", () => {
    const map = buildEmojiMap([["emoji", "a"]]);
    expect(map.size).toBe(0);
  });
});

describe("isValidReaction", () => {
  it("treats native emoji reactions as valid", () => {
    expect(isValidReaction(reaction("👍"))).toBe(true);
    expect(isValidReaction(reaction("🎉"))).toBe(true);
  });

  it("treats +, -, and empty-content reactions as valid", () => {
    expect(isValidReaction(reaction("+"))).toBe(true);
    expect(isValidReaction(reaction(""))).toBe(true);
  });

  it("treats a custom-emoji reaction with a matching emoji tag as valid", () => {
    expect(
      isValidReaction(
        reaction(":blobbi-salute:", [
          ["emoji", "blobbi-salute", "https://e.example/b.png"],
        ]),
      ),
    ).toBe(true);
  });

  it("treats a custom-emoji reaction without the matching tag as invalid", () => {
    expect(isValidReaction(reaction(":blobbi-salute:"))).toBe(false);
    // Tag for the wrong name doesn't count.
    expect(
      isValidReaction(
        reaction(":blobbi-salute:", [
          ["emoji", "something-else", "https://e.example/x.png"],
        ]),
      ),
    ).toBe(false);
  });
});

describe("resolveReactionEmoji", () => {
  it("maps + and empty content to 👍", () => {
    expect(resolveReactionEmoji(reaction("+"))?.content).toBe("👍");
    expect(resolveReactionEmoji(reaction(""))?.content).toBe("👍");
  });

  it("maps - to 👎", () => {
    expect(resolveReactionEmoji(reaction("-"))?.content).toBe("👎");
  });

  it("passes native emojis through unchanged", () => {
    const r = resolveReactionEmoji(reaction("🎉"));
    expect(r?.content).toBe("🎉");
    expect(r?.url).toBeUndefined();
    expect(r?.name).toBeUndefined();
  });

  it("resolves a custom-emoji reaction to its URL + name", () => {
    const r = resolveReactionEmoji(
      reaction(":blobbi-salute:", [
        ["emoji", "blobbi-salute", "https://e.example/b.png"],
      ]),
    );
    expect(r?.content).toBe(":blobbi-salute:");
    expect(r?.url).toBe("https://e.example/b.png");
    expect(r?.name).toBe("blobbi-salute");
  });

  it("returns undefined for a malformed custom-emoji reaction", () => {
    expect(resolveReactionEmoji(reaction(":blobbi-salute:"))).toBeUndefined();
  });
});
