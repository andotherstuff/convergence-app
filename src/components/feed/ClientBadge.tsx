import { Globe } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getClientTag, isForeignClient } from "@/lib/clientTag";
import { cn } from "@/lib/utils";

interface ClientBadgeProps {
  event: NostrEvent;
  className?: string;
}

/**
 * Small "via X" chip rendered in feed-post headers when the event's
 * `client` tag identifies a Nostr client other than this app. Posts
 * authored from this app (or with no `client` tag at all) render
 * nothing, which keeps the badge a signal of "this came from elsewhere"
 * rather than a label on every row.
 *
 * Visible label uses muted, slightly-faded text and a tiny globe icon
 * so it sits below the timestamp in the visual hierarchy. The full
 * explanation lives in a click-triggered Popover (rather than a Tooltip)
 * so it works on touch devices.
 */
export function ClientBadge({ event, className }: ClientBadgeProps) {
  const value = getClientTag(event);
  if (!isForeignClient(value)) return null;
  // `value` is guaranteed non-null when isForeignClient returns true,
  // but TypeScript can't see that through the helper boundary.
  const client = value as string;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Posted from ${client}`}
          className={cn(
            "inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground/70 hover:text-foreground transition-colors",
            className,
          )}
        >
          <Globe className="size-2.5" />
          <span className="truncate max-w-[8rem] underline decoration-dotted underline-offset-2">
            via {client}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 text-xs leading-relaxed"
      >
        Posted from <span className="font-medium">{client}</span>. AOS
        Convergence shows this so you can see which Nostr client a post
        came from.
      </PopoverContent>
    </Popover>
  );
}
