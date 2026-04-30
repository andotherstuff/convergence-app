# AOS Convergence — Custom Event Kinds

This document describes custom Nostr event kinds used by the AOS Convergence
app (https://convergence.andotherstuff.org/).

## Kind 38459 — Project Showcase Submission

**Type:** Addressable event (30000 ≤ kind < 40000)

Represents a project submitted to the AOS Convergence project showcase.
Because it is addressable, the author can edit/update their submission at
any time by republishing the same `d` tag.

### Content

The `content` field contains the full long-form project description in
plaintext. This is **required** and must be non-empty.

### Tags

| Tag       | Required | Repeats | Description                                                              |
|-----------|----------|---------|--------------------------------------------------------------------------|
| `d`       | Yes      | No      | Unique identifier for the submission (slug + random suffix)              |
| `title`   | Yes      | No      | Project title (max 120 chars)                                            |
| `summary` | No       | No      | Short tagline / one-liner shown on cards                                 |
| `url`     | Yes      | No      | Live project URL (must be `http://` or `https://`)                       |
| `repo`    | Yes      | No      | Repository URL (must be `http://` or `https://`)                         |
| `cover`   | Yes      | No      | Cover image URL — a 4:3 landscape hero image shown on the grid and atop the detail page |
| `image`   | No       | Yes     | App screenshot URL(s) shown in a gallery below the description; can be any aspect ratio (mobile or desktop) |
| `zapstore`| No       | No      | Optional Zapstore app ID (Android package name in reverse-domain notation, e.g. `com.example.app`). Matches the `d` tag of the corresponding NIP-82 kind-32267 app event. When present, clients can show a "Get on Zapstore" deep link. |
| `t`       | Yes      | No      | Hashtag — always `aosconvergence` (lowercase)                            |
| `alt`     | Yes      | No      | Human-readable fallback description (per NIP-31)                         |
| `client`  | Yes      | No      | Publisher identifier — always `aos-convergence`                          |

### Validation

Clients should treat a kind 38459 event as invalid and omit it from the
showcase when any of the following are true:

- `content` is empty or whitespace only
- `title`, `url`, `repo`, `d`, or `cover` tags are missing
- `url`, `repo`, or `cover` does not start with `http://` or `https://`

If a `zapstore` tag is present, it **must** match the regex
`^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$` (reverse-domain
package name). Clients that don't recognize it should ignore it
silently; they must not interpolate it into any URL without that
validation, since the identifier is injected into both an Android
`intent://` URL and a `https://zapstore.dev/apps/<id>` URL.

For display in trust-sensitive contexts (editing, deletion), queries should
**filter by the `authors` field** in addition to the `d` tag, because
`d` tags alone are not a trust boundary.

### Comments & Zaps

- **Comments**: Use standard NIP-22 (kind 1111) threading with uppercase
  `A`/`K`/`P` tags for the root and lowercase `a`/`k`/`p` tags for the
  parent. The root `A` tag is
  `38459:<author-pubkey>:<d-tag>`.
- **Zaps**: Use standard NIP-57. Because kind 38459 is addressable, the zap
  request carries an `a` tag (not an `e` tag) referencing the project.

### Example

```json
{
  "kind": 38459,
  "pubkey": "abcdef…",
  "created_at": 1_716_000_000,
  "content": "A decentralized long-form reader that uses Nostr to share\nhighlights and annotations across apps and readers.",
  "tags": [
    ["d", "highlighter-f8a3k9"],
    ["title", "Highlighter"],
    ["summary", "Share highlights and annotations on Nostr"],
    ["url", "https://highlighter.example"],
    ["repo", "https://github.com/example/highlighter"],
    ["cover", "https://blossom.example/cover-4x3.webp"],
    ["image", "https://blossom.example/screenshot-mobile.webp"],
    ["image", "https://blossom.example/screenshot-desktop.webp"],
    ["zapstore", "com.example.highlighter"],
    ["t", "aosconvergence"],
    ["alt", "AOS Convergence project showcase: Highlighter"],
    ["client", "aos-convergence"]
  ],
  "sig": "…"
}
```

## Reused Kinds

The app also relies on these standard Nostr kinds without extension:

- **Kind 0** — Profile metadata (NIP-01)
- **Kind 1** — Text notes. The home feed queries all kind-1 events tagged
  `#aosconvergence`.
- **Kind 31922** — Calendar Event (NIP-52). The canonical AOS Convergence
  calendar event lives at author
  `5d39170696978f274f81b8534ddccf7cdce5a5c0a69ba91fab9f0e5436b4abb1` with
  `d` tag `aos-convergence---oslo-2026-1777480555427-0`.
- **Kind 1111** — Comments (NIP-22) on the calendar event and on each
  kind-38459 project submission.
- **Kind 9734 / 9735** — Zap request and zap receipt (NIP-57) on project
  submissions.
