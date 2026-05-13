import { describe, expect, it } from "vitest";
import { nip19 } from "nostr-tools";
import { buildMentionTags, extractMentionedPubkeys } from "@/lib/mentions";

// A handful of valid NIP-19 fixtures generated from random 32-byte pubkeys.
const PUBKEY_A =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const PUBKEY_B =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
const NPUB_A = nip19.npubEncode(PUBKEY_A);
const NPUB_B = nip19.npubEncode(PUBKEY_B);
const NPROFILE_A = nip19.nprofileEncode({ pubkey: PUBKEY_A, relays: [] });

describe("extractMentionedPubkeys", () => {
  it("returns [] for empty / mention-less content", () => {
    expect(extractMentionedPubkeys("")).toEqual([]);
    expect(extractMentionedPubkeys("Just a regular post")).toEqual([]);
  });

  it("extracts a nostr:npub1… URI", () => {
    expect(
      extractMentionedPubkeys(`Hello nostr:${NPUB_A}, welcome.`),
    ).toEqual([PUBKEY_A]);
  });

  it("extracts a bare npub1… mention", () => {
    expect(extractMentionedPubkeys(`Hello ${NPUB_A}.`)).toEqual([PUBKEY_A]);
  });

  it("extracts an @npub1… mention", () => {
    expect(extractMentionedPubkeys(`Hello @${NPUB_A}.`)).toEqual([PUBKEY_A]);
  });

  it("extracts pubkey from an nprofile URI", () => {
    expect(extractMentionedPubkeys(`hi nostr:${NPROFILE_A}!`)).toEqual([
      PUBKEY_A,
    ]);
  });

  it("deduplicates mentions across forms", () => {
    const text = `nostr:${NPUB_A} also @${NPUB_A} and nostr:${NPROFILE_A}`;
    expect(extractMentionedPubkeys(text)).toEqual([PUBKEY_A]);
  });

  it("preserves first-appearance order with multiple mentions", () => {
    const text = `cc ${NPUB_B} and nostr:${NPUB_A}`;
    expect(extractMentionedPubkeys(text)).toEqual([PUBKEY_B, PUBKEY_A]);
  });

  it("ignores invalid bech32 strings that just happen to start with npub1", () => {
    expect(extractMentionedPubkeys("npub1notrealbech32garbage")).toEqual([]);
  });
});

describe("buildMentionTags", () => {
  it("returns [] for empty input", () => {
    expect(buildMentionTags([])).toEqual([]);
  });

  it("emits a p tag per pubkey, in input order", () => {
    expect(buildMentionTags([PUBKEY_A, PUBKEY_B])).toEqual([
      ["p", PUBKEY_A],
      ["p", PUBKEY_B],
    ]);
  });

  it("deduplicates pubkeys", () => {
    expect(buildMentionTags([PUBKEY_A, PUBKEY_A])).toEqual([["p", PUBKEY_A]]);
  });

  it("respects the exclude set", () => {
    expect(buildMentionTags([PUBKEY_A, PUBKEY_B], [PUBKEY_A])).toEqual([
      ["p", PUBKEY_B],
    ]);
  });
});
