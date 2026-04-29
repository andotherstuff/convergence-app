import { useState } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  Code2,
  ExternalLink,
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
 * Compact card shown in the main feed whenever a project (kind 38459)
 * is published or updated. Links through to the full detail page.
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
    <article className="aos-card aos-card-hover overflow-hidden">
      {/* Activity header: "{author} posted a project" */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-8 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 text-sm">
          <Link
            to={`/${npub}`}
            className="font-semibold text-foreground hover:underline"
          >
            {displayName}
          </Link>{" "}
          <span className="text-muted-foreground">
            shared a project · {timeAgo}
          </span>
        </div>
        <Rocket className="size-4 text-muted-foreground shrink-0" />
      </header>

      {/* Project preview */}
      <Link
        to={`/projects/${project.naddr}`}
        className="block group/link"
      >
        <div className="grid sm:grid-cols-[160px_1fr] gap-4 px-5 pb-4">
          <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden border border-border">
            <img
              src={project.cover}
              alt={project.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1.5 group-hover/link:underline">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
              {project.summary}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="size-3.5" />
                <span className="truncate max-w-[160px]">
                  {project.url
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Code2 className="size-3.5" />
                <span className="truncate max-w-[160px]">
                  {project.repo
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-foreground font-medium group-hover/link:underline">
                View project
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5 pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <ReactionBar target={event} />
        <button
          type="button"
          onClick={() => setShowReply((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-full px-2.5 py-1 border border-border hover:bg-secondary"
          aria-expanded={showReply}
        >
          <MessageCircle className="size-3.5" />
          {showReply ? "Cancel" : "Comment"}
        </button>
      </div>

      {showReply && (
        <div className="px-5 pb-5">
          <InlineReplyForm
            parent={event}
            placeholder="Leave a comment…"
            onSuccess={() => setShowReply(false)}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}
    </article>
  );
}
