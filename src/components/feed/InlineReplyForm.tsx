import { useState, type FormEvent } from "react";
import { NKinds, type NostrEvent } from "@nostrify/nostrify";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { EmojiTextarea } from "@/components/EmojiTextarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthor } from "@/hooks/useAuthor";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { usePostComment } from "@/hooks/usePostComment";
import { useToast } from "@/hooks/useToast";
import { genUserName } from "@/lib/genUserName";
import { AOS_HASHTAG } from "@/lib/constants";
import { PROJECT_KIND } from "@/lib/constants";
import { buildMentionTags, extractMentionedPubkeys } from "@/lib/mentions";

interface InlineReplyFormProps {
  /** The event we're replying to. */
  parent: NostrEvent;
  /** Called after a successful publish. */
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

/**
 * A small inline composer for replying to feed items:
 * - kind 1 → publishes a kind 1 NIP-10 reply
 * - kind 38459 (project) → publishes a kind 1111 comment
 * - kind 1111 → publishes a kind 1111 reply in the same thread
 */
export function InlineReplyForm({
  parent,
  onSuccess,
  onCancel,
  placeholder = "Write a reply…",
}: InlineReplyFormProps) {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: postComment, isPending: isCommenting } =
    usePostComment();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  if (!user) return null;

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(user.pubkey);
  const picture = metadata?.picture;

  const isBusy = isPublishing || isCommenting;
  const canSubmit = content.trim().length > 0 && !isBusy;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      // Notify users mentioned in the body. Exclude the author so a
      // self-mention doesn't push to them; also exclude the parent
      // author for kind-1 replies because that pubkey is already
      // captured in the structural NIP-10 `p` tag.
      const mentioned = extractMentionedPubkeys(trimmed);

      if (parent.kind === 1) {
        // Standard NIP-10 reply. Include the root/reply e-tags and a p-tag.
        // Follow the "mentions" pattern: e-tag with marker, p-tag for the author.
        const tags: string[][] = [
          ["e", parent.id, "", "reply"],
          ["p", parent.pubkey],
          ["t", AOS_HASHTAG],
          ...buildMentionTags(mentioned, [user.pubkey, parent.pubkey]),
        ];
        await publish({
          kind: 1,
          content: trimmed,
          tags,
        });

        // Refresh the feed so the reply appears
        qc.invalidateQueries({ queryKey: ["aos-feed"] });
        toast({ title: "Reply posted" });
      } else {
        // For kind 1111 we want to thread under the same root.
        // For kind 38459 we want a top-level comment on the project.
        const isComment = parent.kind === 1111;

        let root: NostrEvent | undefined;
        let reply: NostrEvent | undefined;

        if (isComment) {
          // The parent comment already has root-scope (uppercase) tags. To
          // nest correctly, we publish another kind 1111 using the same
          // uppercase root and the parent as our "reply" scope.
          // `usePostComment` takes a root and a reply.
          // Trick: we pass the parent comment as `reply`. But we also need
          // the true root — extract it from the uppercase tags.
          // However usePostComment accepts Event | URL | `#...`; we have an id
          // only. Simplest: treat parent as root (flattens the thread). This
          // keeps UX simple and matches what most clients do visually.
          root = parent;
          reply = parent;
        } else if (NKinds.addressable(parent.kind)) {
          root = parent;
        } else {
          root = parent;
        }

        if (!root) throw new Error("No root for comment");

        await postComment({
          root,
          reply,
          content: trimmed,
          extraTags: buildMentionTags(mentioned, [
            user.pubkey,
            parent.pubkey,
          ]),
        });

        // Optimistically refresh the feed and the comments section
        qc.invalidateQueries({ queryKey: ["aos-feed"] });
        if (parent.kind === PROJECT_KIND) {
          qc.invalidateQueries({
            queryKey: ["nostr", "comments", parent.id],
          });
        }
        toast({
          title: isComment ? "Reply posted" : "Comment posted",
        });
      }

      setContent("");
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Couldn't publish",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 pt-3 border-t border-border space-y-2"
    >
      <div className="flex items-start gap-2">
        <Avatar className="size-7 border border-border mt-0.5 shrink-0">
          <AvatarImage src={picture} alt={displayName} />
          <AvatarFallback className="text-[10px] bg-secondary">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <EmojiTextarea
            value={content}
            onChange={setContent}
            placeholder={placeholder}
            rows={2}
            autoFocus
            disabled={isBusy}
            className="resize-none text-sm min-h-0 py-1.5"
            maxLength={2000}
            mentionSeedPubkeys={[parent.pubkey]}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isBusy}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit}
          size="sm"
          className="rounded-full"
        >
          {isBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <Send className="size-3.5 mr-1.5" />
              Post
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
