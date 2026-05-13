import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmojiTextarea } from '@/components/EmojiTextarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePostComment } from '@/hooks/usePostComment';
import { LoginArea } from '@/components/auth/LoginArea';
import { NostrEvent } from '@nostrify/nostrify';
import { MessageSquare } from 'lucide-react';
import { buildMentionTags, extractMentionedPubkeys } from '@/lib/mentions';
import { cn } from '@/lib/utils';

interface CommentFormProps {
  root: NostrEvent | URL | `#${string}`;
  reply?: NostrEvent | URL | `#${string}`;
  onSuccess?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export function CommentForm({
  root,
  reply,
  onSuccess,
  placeholder = "Write a comment...",
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const { user } = useCurrentUser();
  const { mutate: postComment, isPending } = usePostComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || !user) return;

    // Notify users mentioned in the body. Skip the author plus the
    // pubkeys of the root and reply targets, whose pubkeys are already
    // captured in the structural NIP-22 tags.
    const mentioned = extractMentionedPubkeys(content.trim());
    const exclude: string[] = [user.pubkey];
    if (root instanceof Object && "pubkey" in root) exclude.push(root.pubkey);
    if (reply instanceof Object && "pubkey" in reply) exclude.push(reply.pubkey);

    postComment(
      {
        content: content.trim(),
        root,
        reply,
        extraTags: buildMentionTags(mentioned, exclude),
      },
      {
        onSuccess: () => {
          setContent('');
          onSuccess?.();
        },
      }
    );
  };

  if (!user) {
    return (
      <div className={cn("rounded-2xl border border-dashed bg-muted/30", compact ? "p-4" : "p-6")}>
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <MessageSquare className="h-5 w-5" />
            <span>Sign in to {reply ? 'reply' : 'comment'}</span>
          </div>
          <LoginArea />
        </div>
      </div>
    );
  }

  // Seed the @mention autocomplete with the participants we already know
  // about so they surface first.
  const seedPubkeys: string[] = [];
  if (root instanceof Object && "pubkey" in root) seedPubkeys.push(root.pubkey);
  if (reply instanceof Object && "pubkey" in reply) seedPubkeys.push(reply.pubkey);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <EmojiTextarea
        value={content}
        onChange={setContent}
        placeholder={placeholder}
        className={cn("rounded-2xl resize-none", compact ? "min-h-[80px]" : "min-h-[100px]")}
        disabled={isPending}
        mentionSeedPubkeys={seedPubkeys}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!content.trim() || isPending}
          size={compact ? "sm" : "default"}
          className="rounded-full px-6"
        >
          {isPending ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  );
}
