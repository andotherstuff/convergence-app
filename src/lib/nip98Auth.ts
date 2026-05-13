/**
 * NIP-98 HTTP Auth (kind 27235) helper.
 *
 * Mirrors the implementation in the AOS Convergence website repo so both
 * surfaces send identically-shaped tokens to the shared Cloudflare Worker.
 * The worker verifies the signature, checks the `u`/`method` tags, and
 * gates access against its approved-attendee KV namespace.
 *
 * Reference: https://github.com/nostr-protocol/nips/blob/master/98.md
 */

interface SignableUser {
  signer: {
    signEvent: (event: {
      kind: number;
      content: string;
      tags: string[][];
      created_at: number;
    }) => Promise<unknown>;
  };
}

export async function createNip98Token(
  user: SignableUser,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
): Promise<string> {
  const authEvent = await user.signer.signEvent({
    kind: 27235,
    content: "",
    tags: [
      ["u", url],
      ["method", method],
    ],
    created_at: Math.floor(Date.now() / 1000),
  });

  return btoa(JSON.stringify(authEvent));
}
