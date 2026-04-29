import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Megaphone, Send } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthor } from "@/hooks/useAuthor";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useToast } from "@/hooks/useToast";
import { genUserName } from "@/lib/genUserName";
import {
  ANNOUNCEMENT_TAG,
  AOS_HASHTAG,
  isOrganizer,
} from "@/lib/constants";
import { EmojiTextarea } from "@/components/EmojiTextarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoginArea } from "@/components/auth/LoginArea";
import { cn } from "@/lib/utils";

interface ComposeProps {
  /**
   * The hashtag to tag this post with (without the leading '#').
   * Defaults to the AOS hashtag.
   */
  hashtag?: string;
  placeholder?: string;
  /**
   * Locked announcement mode. When true the composer publishes with the
   * `announcement` tag, styles itself as an announcement, and hides the
   * manual toggle. The caller is responsible for only rendering this
   * variant to authorized organizers.
   */
  announcement?: boolean;
}

export function Compose({
  hashtag = AOS_HASHTAG,
  placeholder,
  announcement: announcementLocked = false,
}: ComposeProps = {}) {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tagLower = hashtag.toLowerCase();
  const tagDisplay = `#${hashtag}`;
  const isAosTag = tagLower === AOS_HASHTAG;

  const [content, setContent] = useState("");
  const [imetaTags, setImetaTags] = useState<string[][]>([]);
  const [asAnnouncementToggle, setAsAnnouncementToggle] = useState(false);

  // Locked mode always wins; otherwise fall back to the checkbox state.
  const asAnnouncement = announcementLocked || asAnnouncementToggle;

  if (!user) {
    return (
      <div className="aos-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Join the conversation
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in with your Nostr account to post to the {tagDisplay}{" "}
            feed.
          </p>
        </div>
        <LoginArea className="self-start md:self-auto" />
      </div>
    );
  }

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(user.pubkey);
  const picture = metadata?.picture;
  // Organizer status is needed both for the announcement checkbox on
  // normal composers and as a safety check when announcement mode is
  // locked. Non-organizers should never reach the locked state — the
  // caller guards rendering — but we also check here defensively so a
  // misuse can't forge an announcement.
  const isAosOrganizer = isAosTag && isOrganizer(user.pubkey);
  const showAnnouncementToggle = isAosOrganizer && !announcementLocked;

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const tags = await uploadFile(file);
      const url = tags[0][1];
      const imeta = tags.map(([name, value]) => `${name} ${value}`);
      setImetaTags((prev) => [...prev, ["imeta", ...imeta]]);
      setContent((c) => (c.trim() ? c.trim() + "\n\n" + url : url));
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    // Ensure the hashtag appears in the content so it shows up in clients that
    // only linkify the text, and also add a t-tag for relay-level filtering.
    const hashtagRegex = new RegExp(`#${tagLower}\\b`, "i");
    const finalContent = hashtagRegex.test(trimmed)
      ? trimmed
      : `${trimmed}\n\n${tagDisplay}`;

    const tags: string[][] = [["t", tagLower]];
    // Only allow announcement tagging if the user is actually an
    // organizer. Relays can't enforce this, but clients render an event
    // as an announcement only when the author is in the hard-coded list,
    // so this is belt-and-suspenders against misuse.
    if (asAnnouncement && isAosOrganizer) {
      tags.push(["t", ANNOUNCEMENT_TAG]);
    }
    tags.push(...imetaTags);

    try {
      await publish({
        kind: 1,
        content: finalContent,
        tags,
      });
      setContent("");
      setImetaTags([]);
      if (!announcementLocked) setAsAnnouncementToggle(false);
      toast({ title: asAnnouncement ? "Announcement posted!" : "Posted!" });
      if (isAosTag) {
        queryClient.invalidateQueries({ queryKey: ["aos-feed"] });
      }
      queryClient.invalidateQueries({
        queryKey: ["hashtag-feed", tagLower],
      });
    } catch (err) {
      toast({
        title: "Failed to post",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const canSubmit = content.trim().length > 0 && !isPublishing && !isUploading;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "aos-card p-4 md:p-5 space-y-3",
        asAnnouncement && "border-l-4 border-l-foreground aos-bg-alt"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 border border-border mt-1 shrink-0">
          <AvatarImage src={picture} alt={displayName} />
          <AvatarFallback className="text-sm bg-secondary">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <EmojiTextarea
            value={content}
            onChange={setContent}
            placeholder={
              placeholder ??
              (asAnnouncement
                ? "Write an announcement to the convergence…"
                : isAosTag
                ? "Share something with the convergence…"
                : `Post to ${tagDisplay}…`)
            }
            rows={3}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 text-[0.95rem] placeholder:text-muted-foreground/70"
            maxLength={4000}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors"
            aria-label="Add image"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="sr-only"
              disabled={isUploading || isPublishing}
            />
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageIcon className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isUploading ? "Uploading…" : "Image"}
            </span>
          </label>

          {showAnnouncementToggle && (
            <label
              className={cn(
                "inline-flex items-center gap-1.5 cursor-pointer text-sm transition-colors",
                asAnnouncementToggle
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Post this as an official announcement"
            >
              <input
                type="checkbox"
                checked={asAnnouncementToggle}
                onChange={(e) => setAsAnnouncementToggle(e.target.checked)}
                className="sr-only"
              />
              <Megaphone className="size-4" />
              <span className="hidden sm:inline">Announcement</span>
            </label>
          )}

          {/* Locked announcement mode — show a static indicator instead of a toggle */}
          {announcementLocked && (
            <span
              className="inline-flex items-center gap-1.5 text-foreground text-sm font-medium"
              title="Posting as an organizer announcement"
            >
              <Megaphone className="size-4" />
              <span className="hidden sm:inline">Announcement</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline">
            {tagDisplay}
          </span>
          <Button
            type="submit"
            disabled={!canSubmit}
            size="sm"
            className="rounded-full px-4"
          >
            {isPublishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4 mr-1.5" />
                {asAnnouncement ? "Publish" : "Post"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
