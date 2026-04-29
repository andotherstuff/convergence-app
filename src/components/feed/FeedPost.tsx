import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import type { NostrEvent } from "@nostrify/nostrify";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { NoteContent } from "@/components/NoteContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FeedPostProps {
  event: NostrEvent;
}

export function FeedPost({ event }: FeedPostProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;

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
    <article className="aos-card aos-card-hover p-5 md:p-6">
      <header className="flex items-start gap-3 mb-3">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-10 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-sm bg-secondary text-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              to={`/${npub}`}
              className="font-semibold text-sm text-foreground hover:underline truncate"
            >
              {displayName}
            </Link>
            {nip05 && (
              <span className="text-xs text-muted-foreground truncate">
                {nip05.replace(/^_@/, "")}
              </span>
            )}
          </div>
          <Link
            to={`/${nevent}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {timeAgo}
          </Link>
        </div>
      </header>

      <div className="pl-[52px] -mt-1">
        <NoteContent event={event} className="text-[0.95rem] leading-relaxed" />
      </div>
    </article>
  );
}

export function FeedPostSkeleton() {
  return (
    <div className="aos-card p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-full bg-secondary animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="pl-[52px] space-y-2">
        <div className="h-3 w-full bg-secondary rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-secondary rounded animate-pulse" />
        <div className="h-3 w-3/5 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}
