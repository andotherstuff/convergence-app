import { useState } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  MessageCircle,
  Rocket,
} from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { parseProject } from "@/lib/project";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { InlineReplyForm } from "@/components/feed/InlineReplyForm";

interface FeedProjectCardProps {
  event: NostrEvent;
}

/**
 * Compact row shown in the main feed whenever a project (kind 38459)
 * is published or updated. Same divider-row chrome as other feed items;
 * the project preview lives in an inner bordered box.
 */
export function FeedProjectCard({ event }: FeedProjectCardProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const [showReply, setShowReply] = useState(false);

  const project = parseProject(event);
  if (!project) return null;

  const displayName = metadata?.name || genUserName(event.pubkey);
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  return (
    <article className="aos-feed-row">
      {/* Context breadcrumb */}
      <div className="text-[0.7rem] text-muted-foreground inline-flex items-center gap-1 mb-1.5">
        <Rocket className="size-3 shrink-0" />
        <span>Shared a project</span>
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
          <header className="flex items-baseline gap-1.5 flex-wrap mb-2 leading-tight">
            <Link
              to={`/${npub}`}
              className="font-semibold text-sm text-foreground hover:underline truncate max-w-[60%]"
            >
              {displayName}
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </header>

          {/* Project preview — bordered inset, full width */}
          <Link
            to={`/projects/${project.naddr}`}
            className="block group/link rounded-xl border border-border overflow-hidden hover:border-foreground/40 transition-colors"
          >
            <div className="grid grid-cols-[104px_1fr] sm:grid-cols-[140px_1fr]">
              <div className="aspect-[4/3] bg-secondary overflow-hidden">
                <img
                  src={project.cover}
                  alt={project.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-[1.03]"
                />
              </div>
              <div className="p-3 sm:p-4 flex flex-col min-w-0">
                <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground mb-1 line-clamp-1 group-hover/link:underline">
                  {project.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-3">
                  {project.summary}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  View
                  <ArrowUpRight className="size-3 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </span>
              </div>
            </div>
          </Link>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <ReactionBar target={event} size="sm" />
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={showReply}
            >
              <MessageCircle className="size-3.5" />
              {showReply ? "Cancel" : "Comment"}
            </button>
          </div>

          {showReply && (
            <InlineReplyForm
              parent={event}
              placeholder="Leave a comment…"
              onSuccess={() => setShowReply(false)}
              onCancel={() => setShowReply(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
