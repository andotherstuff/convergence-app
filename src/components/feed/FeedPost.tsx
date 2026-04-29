import { useState } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Megaphone } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { NoteContent } from "@/components/NoteContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { InlineReplyForm } from "@/components/feed/InlineReplyForm";
import { cn } from "@/lib/utils";

interface FeedPostProps {
  event: NostrEvent;
  /** Render with the visually-distinct announcement styling. */
  isAnnouncement?: boolean;
}

export function FeedPost({ event, isAnnouncement = false }: FeedPostProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const [showReply, setShowReply] = useState(false);

  const displayName = metadata?.name || genUserName(event.pubkey);
  const nip05 = metadata?.nip05;
  const picture = metadata?.picture;

  const npub = nip19.npubEncode(event.pubkey);
  const nevent = nip19.neventEncode({
    id: event.id,
    author: event.pubkey,
    kind: event.kind,
  });

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  return (
    <article
      className={cn(
        "aos-feed-row",
        isAnnouncement && "aos-feed-row--announcement"
      )}
    >
      {isAnnouncement && (
        <div className="flex items-center gap-1.5 mb-2 text-[0.65rem] uppercase tracking-[0.16em] font-semibold text-foreground">
          <Megaphone className="size-3" />
          Announcement
        </div>
      )}

      <div className="flex items-start gap-3">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-9 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-secondary text-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <header className="flex items-baseline gap-1.5 flex-wrap mb-0.5 leading-tight">
            <Link
              to={`/${npub}`}
              className="font-semibold text-sm text-foreground hover:underline truncate max-w-[60%]"
            >
              {displayName}
            </Link>
            {nip05 && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                {nip05.replace(/^_@/, "")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <Link
              to={`/${nevent}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {timeAgo}
            </Link>
          </header>

          <NoteContent
            event={event}
            className="text-[0.95rem] leading-relaxed"
          />

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <ReactionBar target={event} size="sm" />
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={showReply}
            >
              <MessageCircle className="size-3.5" />
              {showReply ? "Cancel" : "Reply"}
            </button>
          </div>

          {showReply && (
            <InlineReplyForm
              parent={event}
              onSuccess={() => setShowReply(false)}
              onCancel={() => setShowReply(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function FeedPostSkeleton() {
  return (
    <div className="aos-feed-row">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-full bg-secondary animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
            <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
          </div>
          <div className="h-3 w-full bg-secondary rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
