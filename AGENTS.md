# Project Overview

This is the **attendee companion app** for AOS Convergence — Oslo 2026, a three-day gathering on May 29–31, 2026.

## Two related projects

This repo (the **app**) is one of two related codebases that share branding, a Cloudflare Worker, and an auth model:

- **App** (this repo) — deployed at `https://aos-convergence.app`. A Nostr-powered companion for attendees: a hashtag-scoped social feed, project showcase, announcements channel, a "now happening" banner, and the in-app schedule view at `/schedule`. Browsing the feed/projects is public; the schedule is gated.
- **Website** (`aos-convergence` repo) — deployed at `https://convergence.andotherstuff.org`. The marketing/info site with About, the application form, and the same gated schedule served from `/event`.

### Shared schedule data source

Both surfaces fetch the schedule from the same Cloudflare Worker endpoint (`GET ${API_BASE}/api/event`) using NIP-98 HTTP Auth (kind 27235). The user must:

1. Be signed in with Nostr (any login method: NIP-07 extension, nsec, or nostrconnect).
2. Be on the worker's `APPROVALS` KV list (managed by admins via the website's `/admin` page).

Helpers and types live in:

- `src/lib/apiBase.ts` — `API_BASE` constant (override with `VITE_API_URL`).
- `src/lib/nip98Auth.ts` — NIP-98 token builder.
- `src/hooks/useEventDetails.ts` — TanStack Query hook + `EventDetailsData` type + `EVENT_DETAILS_ERRORS` sentinel messages (`NOT_LOGGED_IN`, `NOT_APPROVED`).
- `src/lib/scheduleNow.ts` — pure functions to flatten the schedule, compute Oslo wall-clock, and match "now happening" against schedule items.
- `src/components/schedule/NowHappening.tsx` — the persistent banner used on Home + Schedule pages.
- `src/pages/Schedule.tsx` — the in-app schedule view (handles all four auth states: logged-out, loading, not-approved, approved).

**Rule:** the schedule's data lives on the worker, not in the app's source. Never hardcode schedule items here. If the schedule changes, update `worker/src/index.ts` in the website repo and redeploy. The app picks up new data automatically (5-minute TanStack Query staleTime).

### Client tag on published events

Every event this app publishes carries a `["client", "aos-convergence.app"]` tag (the canonical value is defined in `src/hooks/useNostrPublish.ts` as `CLIENT_TAG_VALUE`). This is added automatically by `useNostrPublish` for every kind it publishes, so call sites do **not** need to add it manually — and doing so will silently get skipped (the helper only adds it when the caller didn't supply one).

The feed surfaces a small "via &lt;client&gt;" badge on rendered posts authored by *other* Nostr clients (see `src/components/feed/ClientBadge.tsx` and `src/lib/clientTag.ts`). Posts from this app — and posts with no `client` tag — render no badge. The set of values recognized as "native" is in `SELF_CLIENT_IDS`; it includes both the current value and the legacy short value `aos-convergence` so older project events stay un-badged.

If you rename the deployment, update `CLIENT_TAG_VALUE` in `useNostrPublish.ts` and add the old value to `SELF_CLIENT_IDS` so historical events stay recognized.

### Custom emoji (NIP-30) reactions

Kind-7 reactions whose content is a `:shortcode:` carry the image URL on a `["emoji", name, url]` tag. The reaction layer goes through `src/lib/customEmoji.ts` (helpers: `isCustomEmoji`, `getCustomEmojiUrl`, `buildEmojiMap`, `isValidReaction`, `resolveReactionEmoji`) and `src/components/CustomEmoji.tsx` (`<CustomEmojiImg>`). Do not hand-roll new shortcode parsing — use these helpers so behavior stays consistent with `NoteContent.tsx`, which already renders custom emojis inside post bodies.

Malformed custom-emoji reactions (shortcode content with no matching `emoji` tag) are dropped by `aggregateReactions` in `src/hooks/useReactions.ts`. When publishing a reaction, pass `{ shortcode, url }` to `useReact` so the outgoing kind-7 event includes the required `emoji` tag automatically.

### Other shared cross-links

Constants in `src/lib/constants.ts` for website surfaces that do not require auth:

- `WEBSITE_URL`, `WEBSITE_PROGRAM_URL`, `WEBSITE_PROGRAM_FLOW_URL`, `WEBSITE_SCHEDULE_URL`, `WEBSITE_ABOUT_URL`.
- `PROGRAM_URL` is a deprecated alias used only for the "See the public overview" fallback shown to logged-out users on the Schedule page.

Shared design tokens (colors, radii, eyebrow patterns, header lockup) are documented in `BRAND.md` at the root of the website repo. Keep both surfaces visually aligned when making changes.

## Technology Stack

This project is a Nostr client application built with React 19.x, TailwindCSS 4.x, Vite, shadcn/ui, and Nostrify.

## Technology Stack

- **React 19.x**: hooks, concurrent rendering, ref-as-prop
- **TailwindCSS 4.x**: utility-first styling
- **Vite**: dev server and production bundler
- **shadcn/ui**: unstyled accessible components on Radix UI + Tailwind (48+ components in `@/components/ui`)
- **Nostrify** (`@nostrify/react`): Nostr protocol framework
- **React Router**: client-side routing with `BrowserRouter` and automatic scroll-to-top
- **TanStack Query**: data fetching, caching, state
- **TypeScript**: type-safe JS. **Never use the `any` type.**

## Project Structure

- `/src/components/` — UI components. `ui/` holds shadcn/ui primitives; `auth/` holds login components (`LoginArea`, `AuthDialog`, `AccountSwitcher`).
- `/src/hooks/` — custom hooks. Discover the full set with `ls src/hooks/`. Key ones: `useNostr`, `useAuthor`, `useCurrentUser`, `useNostrPublish`, `useUploadFile`, `useAppContext`, `useTheme`, `useToast`, `useLoggedInAccounts`, `useLoginActions`, `useIsMobile`.
- `/src/pages/` — page components wired into React Router (`Index`, `NotFound`, `NIP19Page`).
- `/src/lib/` — utility functions and shared logic.
- `/src/contexts/` — React context providers (`AppContext`).
- `/src/test/` — testing utilities including the `TestApp` wrapper.
- `/public/` — static assets.
- `App.tsx` — **already configured** with `QueryClientProvider`, `NostrProvider`, `UnheadProvider`, `AppProvider`, `NostrLoginProvider`. **Read before editing**; changes are rarely needed.
- `AppRouter.tsx` — React Router configuration. The catch-all `/:nip19` route handles all NIP-19 identifiers (see the `nip19-routing` skill).

**Always read an existing file before modifying it.** Never write over `App.tsx`, `AppRouter.tsx`, or `NostrProvider` without first reading their contents.

## UI Components

Components in `@/components/ui` are unstyled, accessible primitives styled with Tailwind. They follow a consistent pattern using `React.forwardRef` and the `cn()` class-merge utility, and many are built on Radix UI primitives. When you need a specific component, list the directory (`ls src/components/ui/`) or import from `@/components/ui/<name>` — all common primitives are present (buttons, inputs, dialogs, dropdowns, forms, tables, etc.).

## System Prompt Management

The assistant's behavior is defined by this file (`AGENTS.md`). Edit it directly to change guidelines — updates take effect the next session. Specialized workflows live in `/.agents/skills/` as loadable skills, discoverable through the `skill` tool.

## Nostr Protocol Integration

### When to reuse an existing NIP vs. create a new kind

1. **Always review existing NIPs first.** Use the NIP index tool, then read candidate NIPs in detail. The goal is to find the closest existing solution.
2. **Prefer extending existing NIPs** over creating custom kinds, even if it requires minor schema compromises. Custom kinds fragment the ecosystem.
3. **When existing NIPs are close but not perfect**, use the existing kind as the base and add domain-specific tags. Document extensions in `NIP.md`.
4. **Only generate a new kind** when no existing NIP covers the core functionality, the data structure is fundamentally different, or the use case needs different storage characteristics (regular/replaceable/addressable).
5. **If a tool to generate a new kind number is available, you MUST use it** — don't pick an arbitrary number.
6. **Custom kinds MUST include a NIP-31 `alt` tag** with a human-readable description.

### Kind Ranges

- **Regular** (1000 ≤ kind < 10000): stored permanently by relays. Notes, articles, etc.
- **Replaceable** (10000 ≤ kind < 20000): only the latest event per `pubkey+kind` is stored. Profile metadata, contact lists.
- **Addressable** (30000 ≤ kind < 40000): identified by `pubkey+kind+d-tag`; only the latest per combo is stored. Articles, long-form content.

Kinds below 1000 are "legacy"; their storage behavior is per-kind (e.g. kind 1 is regular, kind 3 is replaceable).

### Tag Design Principles

- **Kind = schema, tags = semantics.** Don't create new kinds just to represent a different category of the same data.
- **Relays only index single-letter tags.** Use `t` for categories so filters like `'#t': ['electronics']` work at the relay level. Multi-letter tags (`product_type`, etc.) force inefficient client-side filtering.
- **Filter at the relay.** Pass tag filters in the query rather than fetching everything and filtering in JS.
- **For community/niche apps**, tag events with a `t` and query by it: `createEvent({ kind: 1, content, tags: [['t', 'farming']] })`, then `nostr.query([{ kinds: [1], '#t': ['farming'] }])`. Don't do this for generic platforms.

### Content Field Design

- **Use `content` for** large freeform text or existing industry-standard JSON formats (GeoJSON, FHIR, Tiled). Kind 0 is the one exception where structured JSON goes in `content`.
- **Use tags for** queryable metadata and structured data — anything you might filter on.
- **Empty content is fine.** `content: ""` is idiomatic for tag-only events.
- If you need to filter by a field, it **must** be a tag — relays don't index content.

### NIP.md

`NIP.md` documents any custom kinds/schemas this project defines. If the file doesn't exist, this project has no custom kinds. **Whenever you generate a new kind or change a custom schema, create or update `NIP.md`.**

### Nostr Security Model

**CRITICAL:** Nostr private keys (`nsec`) are stored **in plaintext in `localStorage`**. Any JavaScript running on the origin can steal them. A single XSS = permanent, unrecoverable key theft across every Nostr client the user ever touches. **Treat XSS mitigation as the top-priority security concern.**

- **Never** use `dangerouslySetInnerHTML`, `innerHTML`, or `document.write` with event data, URL params, or other untrusted strings.
- **CSP is defense-in-depth**, not primary defense. `index.html` ships a restrictive CSP (`script-src 'self'`, `default-src 'none'`). Never relax it with `'unsafe-eval'`, `'unsafe-inline'` on `script-src`, or wildcard sources.
- **Sanitize every event-sourced URL** (`sanitizeUrl()` — https-only allowlist) before using it as `href`, `src`, iframe `src`, or CSS `url()`.
- **Sanitize every event-sourced string interpolated into CSS**. A malicious `font-family` or `url()` value can break out of the CSS context and inject rules.

Beyond XSS, Nostr is permissionless — signatures prove authorship, not trustworthiness. Filter by `authors` whenever trust is implied:

- **Admin/moderator/owner queries** — filter by trusted pubkeys.
- **Addressable events (kinds 30000–39999)** and **user-owned replaceable events** — filter by `authors`; the `d` tag alone is not a trust boundary.
- **Routes for addressable/replaceable events** — include the author in the URL (e.g. `/article/:npub/:slug`) so the filter can constrain on author.
- **Public UGC** (kind 1 notes, reactions, public feeds, discovery) — author filtering NOT required.

```ts
// ❌ Anyone can spoof this event
nostr.query([{ kinds: [30078], '#d': ['pathos-organizers'], limit: 1 }]);
// ✅ Only trust admin authors
nostr.query([{ kinds: [30078], authors: ADMIN_PUBKEYS, '#d': ['pathos-organizers'], limit: 1 }]);
```

For the full threat model — CSP walkthrough, `sanitizeUrl` / `sanitizeCssString` implementations, NIP-72 community moderation, and the pre-merge checklist — load the **`nostr-security`** skill.

### The `useNostr` Hook

```ts
import { useNostr } from '@nostrify/react';

function useCustomHook() {
  const { nostr } = useNostr();
  // nostr.query(filters) / nostr.event(event) / nostr.req(filters)
}
```

By default `nostr` uses the app's connection pool (reads from one relay, publishes to all configured). For targeted single-relay or relay-group calls, load the **`nostr-relay-pools`** skill.

### Querying with TanStack Query

Combine `useNostr` with `useQuery` in custom hooks:

```ts
function usePosts() {
  const { nostr } = useNostr();
  return useQuery({
    queryKey: ['posts'],
    queryFn: async (c) => nostr.query([{ kinds: [1], limit: 15 }], { signal: c.signal }),
  });
}
```

**Efficient query design** — minimize round-trips:

- **Combine kinds** in one filter: `{ kinds: [1, 6, 16], '#e': [eventId] }` and split by kind in JS. Don't run three parallel queries for repost variants.
- **Use multiple filter objects** in one query when different tag filters are needed.
- **Raise `limit`** when combining so you still get enough of each kind.
- Each query costs relay capacity and may count against rate limits.

**Event validation** — for kinds with required tags or strict schemas, filter query results through a validator:

```ts
function isValidCalendarEvent(event: NostrEvent): boolean {
  if (![31922, 31923].includes(event.kind)) return false;
  const d = event.tags.find(([n]) => n === 'd')?.[1];
  const title = event.tags.find(([n]) => n === 'title')?.[1];
  const start = event.tags.find(([n]) => n === 'start')?.[1];
  return Boolean(d && title && start);
}

const events = (await nostr.query([{ kinds: [31922, 31923], limit: 15 }]))
  .filter(isValidCalendarEvent);
```

Validation is optional for loose kinds (kind 1), but strongly recommended for custom kinds and kinds with required tags.

### The `useAuthor` Hook

Fetch profile metadata (kind 0) for a pubkey:

```tsx
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';

function Post({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  // ...
}
```

The `NostrMetadata` type (from `@nostrify/nostrify`) covers the standard kind-0 fields: `name`, `display_name`, `about`, `picture`, `banner`, `website`, `nip05`, `lud06`, `lud16`, `bot`. Read the type definition from the package if you need the exact field list.

### The `useNostrPublish` Hook

Publishes events (auto-adds a `client` tag). Always guard with `useCurrentUser`:

```tsx
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

export function MyComponent() {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();

  if (!user) return <span>You must be logged in.</span>;

  return (
    <button onClick={() => createEvent({ kind: 1, content: 'hello' })}>
      Publish
    </button>
  );
}
```

### Nostr Login

Use the `LoginArea` component (already in the project). It renders a single "Join" button when logged out (opens an `AuthDialog` supporting signup, extension, nsec, and remote signer) and becomes an account switcher when logged in. **Do not wrap it in conditional logic.**

```tsx
import { LoginArea } from '@/components/auth/LoginArea';

<LoginArea className="max-w-60" />
```

`LoginArea` is inline-flex by default. Pass `flex` or `w-full` to expand it; otherwise set a sensible `max-w-*`.

**Social apps should include a profile/account menu in the main navigation** for access to settings, profile editing, and logout — don't only show `LoginArea` in logged-out states.

### NIP-19 Identifiers

Nostr uses bech32-encoded identifiers (`npub1`, `nprofile1`, `note1`, `nevent1`, `naddr1`, `nsec1`). **All NIP-19 identifiers are routed at the URL root (`/:nip19`)**, handled by `src/pages/NIP19Page.tsx` — never nest them under `/note/`, `/profile/`, etc.

**Filters only accept hex.** Always decode before querying:

```ts
import { nip19 } from 'nostr-tools';

const decoded = nip19.decode(value);
if (decoded.type !== 'naddr') throw new Error('Unsupported identifier');
const { kind, pubkey, identifier } = decoded.data;

nostr.query([{
  kinds: [kind],
  authors: [pubkey],        // critical for addressable events
  '#d': [identifier],
}]);
```

Never treat `nsec1` or unknown prefixes as anything but a 404.

**For full details** (identifier-type comparison, populating `NIP19Page`, building NIP-19 links, security patterns), load the **`nip19-routing`** skill.

### File Uploads, Encryption, Multi-Relay

These are specialized workflows — load the matching skill when needed:

- **`file-uploads`** — `useUploadFile` + Blossom + NIP-94 `imeta` tags.
- **`nostr-encryption`** — NIP-44 / NIP-04 via the user's signer (DMs, gift wraps, private content).
- **`nostr-relay-pools`** — `nostr.relay(url)` / `nostr.group([urls])` for targeted queries.

## App Configuration

The `AppProvider` manages global state (theme + NIP-65 relay list), persisted to local storage.

```ts
const defaultConfig: AppConfig = {
  theme: 'light',
  relayMetadata: {
    relays: [
      { url: 'wss://relay.ditto.pub', read: true, write: true },
      { url: 'wss://relay.primal.net', read: true, write: true },
      { url: 'wss://relay.damus.io', read: true, write: true },
    ],
    updatedAt: 0,
  },
};
```

### Relay Management

- **`NostrSync`** auto-loads the user's NIP-65 relay list on login and writes it into `AppContext`.
- **Automatic publishing** — updating the relay config publishes a new kind 10002 event when the user is logged in.
- A drop-in settings UI (`RelayListManager`) is available as the **`relay-management`** skill.

## Routing

Routes live in `AppRouter.tsx`. To add one:

1. Create the page component in `src/pages/`.
2. Import it in `AppRouter.tsx`.
3. Add the route **above** the catch-all `*` route:

```tsx
<Route path="/your-path" element={<YourComponent />} />
```

The router provides automatic scroll-to-top on navigation and a 404 `NotFound` page. The `/:nip19` route is already wired (see the `nip19-routing` skill).

## Design Standards

Designs should be polished and production-ready. Concrete rules:

- **Responsive** down to ~360px; test mobile, tablet, desktop.
- **WCAG 2.1 AA**: ≥ 4.5:1 contrast for body text, ≥ 3:1 for large text and UI elements. Full keyboard nav, ARIA labels, visible `focus-visible` rings.
- **8px grid** for spacing (Tailwind's 4-based scale). Don't sprinkle `p-[13px]`-style one-offs.
- **Typography hierarchy**: ≥ 18px body, ≥ 40px primary headlines. Prefer a modern sans (e.g. Inter) for UI and pair a display/serif for headings when personality is needed.
- **Depth**: soft shadows, gentle gradients, rounded corners (`rounded-lg` / `rounded-xl`). Avoid heavy drop shadows.
- **Motion**: lightweight, purposeful (hover, scroll reveals, transitions). Respect `prefers-reduced-motion` with Tailwind's `motion-safe:` / `motion-reduce:` variants.
- **Reusable components**: consistent variants and feedback states (`hover`, `focus-visible`, `active`, `disabled`, `aria-invalid`). Use `cn()` for conditional classes and `class-variance-authority` for variants (copy an existing `ui/` component as a template).
- **Custom over generic**: avoid template-looking headers — combine layered visuals, subtle motion, and brand colors. Generate custom images with available tools before reaching for stock.

### Loading and Empty States

**Use skeletons** for structured content (feeds, profiles, forms). **Use spinners** only for buttons or short operations.

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  </CardContent>
</Card>
```

For empty results, show a minimalist empty state in a `border-dashed` card:

```tsx
<Card className="border-dashed">
  <CardContent className="py-12 px-8 text-center">
    <p className="text-muted-foreground max-w-sm mx-auto">
      No results found. Try checking your relay connections or wait a moment for content to load.
    </p>
  </CardContent>
</Card>
```

For font installation, color-scheme changes, light/dark theming, or the `isolate` + negative-z-index gotcha, load the **`theming`** skill.

## Writing Tests vs. Running Tests

**Running the existing test script — always do it.** After any code change, run the project's test/validation script. **Your task is not complete until it passes.** The script typically covers TypeScript compilation, ESLint, and existing tests.

**Writing new test files — don't, unless the user asks.** If the user explicitly requests tests, describes a bug to diagnose with a test, or reports that a problem persists after a fix, load the **`testing`** skill for the project's Vitest + `TestApp` setup and policy.

## Validating Your Changes

**Your task is not finished until the code type-checks and builds without errors.** In priority order:

1. **Type check** (required)
2. **Build/compile** (required)
3. **Lint** (recommended; fix anything critical)
4. **Run tests** (if available)
5. **Git commit** (required)

### Using Git

Use `git status` / `git diff` to review changes and `git log` to learn project conventions. If you make a mistake, `git checkout` restores files.

**Always commit when you are finished.** Non-negotiable — every completed task ends with a commit. Don't wait for the user to ask.
