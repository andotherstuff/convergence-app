import { useState } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, MessageSquareText } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { NoteContent } from "@/components/NoteContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { InlineReplyForm } from "@/components/feed/InlineReplyForm";
import { PROJECT_KIND } from "@/lib/constants";

interface FeedCommentProps {
  event: NostrEvent;
}

/** Extract root context info from a kind-1111 comment's tags. */
function getRootContext(event: NostrEvent): {
  label: string;
  to: string | null;
} {
  const A = event.tags.find(([n]) => n === "A")?.[1];
  if (A) {
    const [kindStr, pubkey, identifier] = A.split(":");
    const kind = Number(kindStr);
    if (kind === PROJECT_KIND && pubkey && identifier) {
      try {
        const naddr = nip19.naddrEncode({ kind, pubkey, identifier });
        return { label: "a project", to: `/projects/${naddr}` };
      } catch {
        /* fall through */
      }
    }
    return { label: `a ${kindStr}`, to: null };
  }

  const E = event.tags.find(([n]) => n === "E")?.[1];
  if (E) {
    try {
      const nevent = nip19.neventEncode({ id: E });
      return { label: "a post", to: `/${nevent}` };
    } catch {
      return { label: "a post", to: null };
    }
  }

  return { label: "a post", to: null };
}

export function FeedComment({ event }: FeedCommentProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const [showReply, setShowReply] = useState(false);

  const displayName = metadata?.name || genUserName(event.pubkey);
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const { label, to } = getRootContext(event);

  return (
    <article className="aos-feed-row">
      {/* Context breadcrumb */}
      <div className="text-[0.7rem] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
        <MessageSquareText className="size-3 shrink-0" />
        <span>
          Comment on{" "}
          {to ? (
            <Link
              to={to}
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </span>
      </div>

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
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
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
