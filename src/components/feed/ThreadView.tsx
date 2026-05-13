import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Megaphone, Send } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { EmojiTextarea } from "@/components/EmojiTextarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoteContent } from "@/components/NoteContent";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { LoginArea } from "@/components/auth/LoginArea";
import { ClientBadge } from "@/components/feed/ClientBadge";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useSingleEvent, useThreadReplies } from "@/hooks/useSingleEvent";
import { useToast } from "@/hooks/useToast";
import { genUserName } from "@/lib/genUserName";
import { AOS_HASHTAG } from "@/lib/constants";
import { isAnnouncement } from "@/hooks/useAosFeed";
import { cn } from "@/lib/utils";

interface ThreadViewProps {
  eventId: string;
  author?: string;
  kind?: number;
}

export function ThreadView({ eventId, author, kind }: ThreadViewProps) {
  const { data: rootEvent, isLoading: rootLoading } = useSingleEvent(
    eventId,
    author,
    kind
  );

  return (
    <Layout>
      <section className="aos-shell pt-6 md:pt-10 pb-16 md:pb-24 max-w-2xl">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 text-muted-foreground"
        >
          <Link to="/">
            <ArrowLeft className="size-4 mr-1.5" />
            Back to feed
          </Link>
        </Button>

        {rootLoading && <ThreadSkeleton />}

        {!rootLoading && !rootEvent && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't find this post on the configured relays.
            </p>
          </div>
        )}

        {!rootLoading && rootEvent && <Thread rootEvent={rootEvent} />}
      </section>
    </Layout>
  );
}

function Thread({ rootEvent }: { rootEvent: NostrEvent }) {
  const { data: replies = [], isLoading: repliesLoading } = useThreadReplies(
    rootEvent.id
  );

  return (
    <>
      <RootPost event={rootEvent} />

      <ReplyComposer root={rootEvent} />

      <div className="mt-8">
        <div className="aos-kicker mb-4">
          {replies.length === 1
            ? "1 reply"
            : `${replies.length} ${replies.length === 0 ? "replies" : "replies"}`}
        </div>

        {repliesLoading && (
          <div className="space-y-4">
            <ReplySkeleton />
            <ReplySkeleton />
          </div>
        )}

        {!repliesLoading && replies.length === 0 && (
          <div className="aos-card border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No replies yet. Be the first to respond.
            </p>
          </div>
        )}

        {!repliesLoading && replies.length > 0 && (
          <div className="space-y-4">
            {replies.map((reply) => (
              <ReplyCard key={reply.id} event={reply} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RootPost({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(event.pubkey);
  const nip05 = metadata?.nip05;
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const announcement = isAnnouncement(event);

  return (
    <article
      className={cn(
        "aos-card p-5 md:p-6",
        announcement && "border-l-4 border-l-foreground aos-bg-alt"
      )}
    >
      {announcement && (
        <div className="flex items-center gap-1.5 mb-3 text-[0.65rem] uppercase tracking-[0.16em] font-semibold text-foreground">
          <Megaphone className="size-3" />
          Announcement
        </div>
      )}

      <header className="flex items-center gap-3 mb-3">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-11 border border-border">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-sm bg-secondary text-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 leading-tight">
          <Link
            to={`/${npub}`}
            className="font-semibold text-sm text-foreground hover:underline block truncate"
          >
            {displayName}
          </Link>
          <div className="text-xs text-muted-foreground flex items-baseline gap-1.5 flex-wrap">
            {nip05 && (
              <span className="truncate">{nip05.replace(/^_@/, "")}</span>
            )}
            {nip05 && <span>·</span>}
            <span>{timeAgo}</span>
            <ClientBadge event={event} />
          </div>
        </div>
      </header>

      <NoteContent
        event={event}
        className="text-[1rem] leading-relaxed"
      />

      <div className="mt-4 pt-4 border-t border-border">
        <ReactionBar target={event} />
      </div>
    </article>
  );
}

function ReplyCard({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(event.pubkey);
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
    <article className="aos-card p-4 md:p-5">
      <header className="flex items-center gap-2.5 mb-2">
        <Link to={`/${npub}`} className="shrink-0">
          <Avatar className="size-8 border border-border">
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
          <Link
            to={`/${nevent}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {timeAgo}
          </Link>
          <ClientBadge event={event} />
        </div>
      </header>

      <NoteContent event={event} className="text-[0.95rem] leading-relaxed" />

      <div className="mt-3">
        <ReactionBar target={event} size="sm" />
      </div>
    </article>
  );
}

function ReplyComposer({ root }: { root: NostrEvent }) {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  if (!user) {
    return (
      <div className="aos-card mt-4 p-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Sign in with Nostr to join this conversation.
        </p>
        <LoginArea className="max-w-60" />
      </div>
    );
  }

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(user.pubkey);
  const picture = metadata?.picture;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      await publish({
        kind: 1,
        content: trimmed,
        tags: [
          ["e", root.id, "", "reply"],
          ["p", root.pubkey],
          ["t", AOS_HASHTAG],
        ],
      });
      setContent("");
      toast({ title: "Reply posted" });
      qc.invalidateQueries({ queryKey: ["thread-replies", root.id] });
      qc.invalidateQueries({ queryKey: ["comment-count", root.id] });
    } catch (err) {
      toast({
        title: "Couldn't publish reply",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const canSubmit = content.trim().length > 0 && !isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="aos-card mt-4 p-4 md:p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 border border-border mt-1 shrink-0">
          <AvatarImage src={picture} alt={displayName} />
          <AvatarFallback className="text-xs bg-secondary">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <EmojiTextarea
            value={content}
            onChange={setContent}
            placeholder="Write a reply…"
            rows={3}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 text-[0.95rem] placeholder:text-muted-foreground/70"
            maxLength={4000}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <Button
          type="submit"
          disabled={!canSubmit}
          size="sm"
          className="rounded-full px-4"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-4 mr-1.5" />
              Reply
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function ThreadSkeleton() {
  return (
    <div className="aos-card p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-11 rounded-full bg-secondary animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
          <div className="h-2.5 w-20 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-secondary rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-secondary rounded animate-pulse" />
        <div className="h-3 w-3/5 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}

function ReplySkeleton() {
  return (
    <div className="aos-card p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="size-8 rounded-full bg-secondary animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-secondary rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}

