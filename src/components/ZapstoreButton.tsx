import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface ZapstoreButtonProps {
  /**
   * Zapstore app identifier — the Android package name in reverse-
   * domain notation (e.g. `dev.zapstore.app`). This is the `d` tag of
   * the corresponding NIP-82 kind-32267 app event.
   */
  appId: string;
  /** Visual variant — default shows a prominent pill; `subtle` is an
   *  unobtrusive link used inside dense UI like project cards. */
  variant?: "default" | "subtle";
  className?: string;
  /** Label override. Default: "Get on Zapstore". */
  label?: string;
}

/**
 * Sanity check the app identifier so we never interpolate an
 * attacker-controlled string into a URL or HTML attribute.
 * Matches reverse-domain notation: letter-starts segments separated
 * by dots, at least one dot, no other characters.
 */
function isValidAppId(id: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(id);
}

/** Detect Android (including tablets). */
function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Open in Zapstore. Cascade:
 *
 *  1. Android → use an `intent://` URL that targets the Zapstore app
 *     directly. If Zapstore is installed, Chrome opens it; if not, the
 *     `S.browser_fallback_url` takes the user to the Zapstore web page
 *     for that app.
 *  2. Everything else (desktop, iOS) → open the Zapstore web page for
 *     that app in a new tab.
 *
 * The web fallback URL is `https://zapstore.dev/apps/<id>`, which
 * works today as a browsable page even though it isn't yet a working
 * Android App Link.
 */
export function ZapstoreButton({
  appId,
  variant = "default",
  className,
  label = "Get on Zapstore",
}: ZapstoreButtonProps) {
  const isValid = isValidAppId(appId);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isValid) {
        e.preventDefault();
        return;
      }

      if (isAndroid()) {
        e.preventDefault();
        // Android Chrome's intent:// scheme: try the Zapstore package
        // first via a market:// intent; if the app isn't installed,
        // fall back to the web URL.
        const fallback = `https://zapstore.dev/apps/${encodeURIComponent(
          appId
        )}`;
        const intentUrl =
          `intent://details?id=${encodeURIComponent(appId)}` +
          `#Intent;scheme=market;package=dev.zapstore.app;` +
          `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
        // Navigating via `window.location` ensures Chrome treats this
        // as a user-initiated navigation and will actually try the
        // intent. `window.open` can be blocked by popup blockers.
        window.location.href = intentUrl;
      }
      // Otherwise let the <a> href handle it — opens the web page in a
      // new tab.
    },
    [appId, isValid]
  );

  if (!isValid) return null;

  const href = `https://zapstore.dev/apps/${encodeURIComponent(appId)}`;

  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap";
  const variants = {
    default:
      // Match shadcn <Button variant="outline" size="default"> box
      // metrics so this sits flush with the Visit / Repository / Zap
      // pills next to it on project detail pages.
      "h-9 px-4 py-2 rounded-full border border-border bg-background text-foreground hover:bg-secondary hover:text-foreground text-sm shadow-xs",
    subtle:
      "text-xs text-muted-foreground hover:text-foreground",
  } as const;

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(base, variants[variant], className)}
      aria-label={label}
    >
      <ZapstoreGlyph className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </a>
  );
}

/**
 * Minimal lightning-bolt-in-a-rounded-square glyph in the AOS
 * black-and-white palette. Doesn't attempt to copy the Zapstore logo —
 * just suggests "lightning app store" at a glance.
 */
function ZapstoreGlyph({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path
        d="M13 7 L8 13 h4 l-1 4 L16 11 h-4 l1 -4 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
