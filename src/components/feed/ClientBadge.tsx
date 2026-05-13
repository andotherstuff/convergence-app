import { Globe } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getClientTag, isForeignClient } from "@/lib/clientTag";
import { cn } from "@/lib/utils";

interface ClientBadgeProps {
  event: NostrEvent;
  className?: string;
}

/**
 * Small "via X" chip rendered in feed-post headers when the event's
 * `client` tag identifies a Nostr client other than this app. Posts
 * authored from this app (or with no `client` tag at all) render nothing,
 * which keeps the badge a signal of "this came from elsewhere" rather
 * than a label on every row.
 *
 * Visible label uses muted, slightly-faded text and a tiny globe icon
 * so it sits below the timestamp in the visual hierarchy. The full
 * disclosure (what the value means + why we show it) lives in the
 * tooltip on hover/focus.
 */
export function ClientBadge({ event, className }: ClientBadgeProps) {
  const value = getClientTag(event);
  if (!isForeignClient(value)) return null;
  // `value` is guaranteed non-null when isForeignClient returns true,
  // but TypeScript can't see that through the helper boundary.
  const client = value as string;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[0.7rem] text-muted-foreground/70 cursor-help",
            className,
          )}
          aria-label={`Posted from ${client}`}
        >
          <Globe className="size-2.5" />
          <span className="truncate max-w-[8rem]">via {client}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        Posted from <span className="font-medium">{client}</span>. AOS
        Convergence shows this so you can see which Nostr client a post
        came from.
      </TooltipContent>
    </Tooltip>
  );
}
