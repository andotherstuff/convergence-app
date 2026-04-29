import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, MessageCircle, Rocket } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { useCommentCount } from "@/hooks/useCommentCount";
import { genUserName } from "@/lib/genUserName";
import { parseProject } from "@/lib/project";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { ZapButton } from "@/components/ZapButton";

interface FeedProjectCardProps {
  event: NostrEvent;
}

/**
 * Project share in the main feed. Renders like a social-media link
 * preview: full-width cover image at the top of the card, title +
 * summary beneath. The whole preview block is one tappable link to
 * the project's detail page.
 */
export function FeedProjectCard({ event }: FeedProjectCardProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const { data: commentCount = 0 } = useCommentCount(event);

  const project = parseProject(event);
  if (!project) return null;

  const displayName = metadata?.name || genUserName(event.pubkey);
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  // Link to the project detail page's Discussion section. The page
  // already renders the full CommentsSection at the bottom.
  const discussionHref = `/projects/${project.naddr}#discussion`;

  return (
    <article className="aos-feed-row">
      {/* Context breadcrumb */}
      <div className="text-[0.7rem] text-muted-foreground inline-flex items-center gap-1 mb-2">
        <Rocket className="size-3 shrink-0" />
        <span>Shared a project</span>
      </div>

      {/* Header: avatar + name/time */}
      <header className="flex items-center gap-2.5 mb-3">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-9 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-secondary text-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap leading-tight">
          <Link
            to={`/${npub}`}
            className="font-semibold text-sm text-foreground hover:underline truncate max-w-[60%]"
          >
            {displayName}
          </Link>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </header>

      {/* Project preview — full-width OpenGraph-style card.
          Uses <Link> so the whole area is tappable. */}
      <Link
        to={`/projects/${project.naddr}`}
        className="block group/link rounded-2xl border border-border overflow-hidden hover:border-foreground/40 transition-colors bg-card"
      >
        <div className="aspect-[16/9] bg-secondary overflow-hidden">
          <img
            src={project.cover}
            alt={project.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-[1.02]"
          />
        </div>
        <div className="p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-foreground mb-1 line-clamp-1 group-hover/link:underline">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
              {project.summary}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground group-hover/link:bg-foreground group-hover/link:text-background group-hover/link:border-foreground transition-colors">
            <ArrowUpRight className="size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </span>
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <ReactionBar target={event} size="sm" />
        <div className="flex items-center gap-4">
          <ZapButton target={event} className="text-xs" />
          <Link
            to={discussionHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={
              commentCount === 1
                ? "1 comment — open discussion"
                : `${commentCount} comments — open discussion`
            }
          >
            <MessageCircle className="size-3.5" />
            <span className="tabular-nums font-medium">{commentCount}</span>
            <span className="hidden sm:inline">
              {commentCount === 1 ? "comment" : "comments"}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
