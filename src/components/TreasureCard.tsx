import { useState } from "react";
import { nip19 } from "nostr-tools";
import type { NostrEvent } from "@nostrify/nostrify";
import { ExternalLink, Eye, EyeOff, MapPin, Sparkles } from "lucide-react";
import { useAuthor } from "@/hooks/useAuthor";
import { useAddressableEvent } from "@/hooks/useAddressableEvent";
import { genUserName } from "@/lib/genUserName";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const TREASURE_KIND = 37515;

interface TreasureCardProps {
  coord: { kind: number; pubkey: string; identifier: string };
  /** Optional URL the user actually pasted (used for the external link). */
  sourceUrl?: string;
  className?: string;
}

/**
 * Rich preview card for a Treasures (kind 37515) addressable event.
 * Fetches the event by coordinate and renders its name, cover image,
 * description, stats (difficulty, terrain, size, type), status, and
 * a ROT13-protected hint — styled to match Ditto's Treasure embeds.
 */
export function TreasureCard({ coord, sourceUrl, className }: TreasureCardProps) {
  const { data: event, isLoading } = useAddressableEvent(coord);

  if (isLoading) {
    return <TreasureCardSkeleton className={className} />;
  }

  if (!event) {
    return <TreasureCardMissing coord={coord} sourceUrl={sourceUrl} className={className} />;
  }

  return <TreasureCardBody event={event} sourceUrl={sourceUrl} className={className} />;
}

function TreasureCardBody({
  event,
  sourceUrl,
  className,
}: {
  event: NostrEvent;
  sourceUrl?: string;
  className?: string;
}) {
  const author = useAuthor(event.pubkey);
  const [showHint, setShowHint] = useState(false);

  const tag = (name: string) =>
    event.tags.find(([n]) => n === name)?.[1];

  const name = tag("name") ?? "Untitled Treasure";
  const image = tag("image");
  const rawLocation = tag("location");
  const status = tag("status");
  const hint = tag("hint");
  const description = event.content?.trim() ?? "";

  const safeImage = image ? sanitizeUrl(image) : null;
  const metadata = author.data?.metadata;
  const authorName = metadata?.name || genUserName(event.pubkey);
  const authorPic = metadata?.picture;
  const authorNpub = nip19.npubEncode(event.pubkey);

  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier: tag("d") ?? "",
  });

  // External link to the Treasures app itself — fall back to the canonical
  // host if we didn't see a user-supplied URL.
  const externalHref =
    sourceUrl && /^https?:\/\//i.test(sourceUrl)
      ? sanitizeUrl(sourceUrl)
      : `https://treasures.to/${naddr}?fromMap=true`;

  const isActive = (status ?? "active").toLowerCase() === "active";

  return (
    <div
      className={cn(
        "not-prose block rounded-2xl border border-border bg-card overflow-hidden my-2",
        className
      )}
    >
      {safeImage && (
        <div className="aspect-[16/9] bg-secondary overflow-hidden">
          <img
            src={safeImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Kicker: Treasure badge + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="aos-eyebrow text-[0.6rem]">
            <Sparkles className="size-3" />
            Treasure
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-wider font-medium rounded-full px-2 py-0.5",
              isActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isActive ? "bg-emerald-500" : "bg-muted-foreground/60"
              )}
            />
            {status ?? "active"}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
          {name}
        </h3>

        {/* Author row */}
        <a
          href={`/${authorNpub}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Avatar className="size-5 border border-border">
            <AvatarImage src={authorPic} alt={authorName} />
            <AvatarFallback className="text-[8px] bg-secondary">
              {authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[14rem]">Placed by {authorName}</span>
        </a>

        {/* Description */}
        {description && (
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        )}

        {/* Hint — geocaching convention is ROT13. Let the user reveal it. */}
        {hint && (
          <div className="rounded-lg border border-dashed border-border p-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHint((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={showHint}
            >
              {showHint ? (
                <>
                  <EyeOff className="size-3" />
                  Hide hint
                </>
              ) : (
                <>
                  <Eye className="size-3" />
                  Show hint
                </>
              )}
            </button>
            {showHint && (
              <p className="mt-1.5 text-sm text-foreground/85 leading-relaxed">
                {rot13(hint)}
              </p>
            )}
          </div>
        )}

        {/* Footer action row */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {rawLocation && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              <span className="font-mono tabular-nums">{rawLocation}</span>
            </span>
          )}
          <a
            href={externalHref}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline underline-offset-4"
          >
            View on Treasures
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

/** Simple ROT13 — safe for ASCII letters, leaves everything else alone. */
function rot13(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + 13) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + 13) % 26) + 97);
    } else {
      out += ch;
    }
  }
  return out;
}

function TreasureCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "not-prose rounded-2xl border border-border bg-card overflow-hidden my-2",
        className
      )}
    >
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-2/3" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}

function TreasureCardMissing({
  coord,
  sourceUrl,
  className,
}: {
  coord: { kind: number; pubkey: string; identifier: string };
  sourceUrl?: string;
  className?: string;
}) {
  const naddr = nip19.naddrEncode(coord);
  const href =
    sourceUrl && /^https?:\/\//i.test(sourceUrl)
      ? sanitizeUrl(sourceUrl)
      : `https://treasures.to/${naddr}?fromMap=true`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "not-prose flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 my-2 hover:border-foreground/40 transition-colors",
        className
      )}
    >
      <span className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <Sparkles className="size-4 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground truncate">
          Treasure
        </span>
        <span className="block text-xs text-muted-foreground truncate">
          Couldn't load from relays — open on Treasures
        </span>
      </span>
      <ExternalLink className="size-4 text-muted-foreground shrink-0" />
    </a>
  );
}
