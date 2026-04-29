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
  AOS_HASHTAG_DISPLAY,
  isOrganizer,
} from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoginArea } from "@/components/auth/LoginArea";
import { cn } from "@/lib/utils";

export function Compose() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [imetaTags, setImetaTags] = useState<string[][]>([]);
  const [asAnnouncement, setAsAnnouncement] = useState(false);

  if (!user) {
    return (
      <div className="aos-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Join the conversation
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in with your Nostr account to post to the {AOS_HASHTAG_DISPLAY}{" "}
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
  const organizer = isOrganizer(user.pubkey);

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
    const hashtagRegex = new RegExp(`#${AOS_HASHTAG}\\b`, "i");
    const finalContent = hashtagRegex.test(trimmed)
      ? trimmed
      : `${trimmed}\n\n${AOS_HASHTAG_DISPLAY}`;

    const tags: string[][] = [["t", AOS_HASHTAG]];
    if (asAnnouncement && organizer) {
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
      setAsAnnouncement(false);
      toast({ title: asAnnouncement ? "Announcement posted!" : "Posted!" });
      queryClient.invalidateQueries({ queryKey: ["aos-feed"] });
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

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            asAnnouncement
              ? "Write an announcement to the convergence…"
              : "Share something with the convergence…"
          }
          rows={3}
          className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 text-[0.95rem] placeholder:text-muted-foreground/70"
          maxLength={4000}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pl-[48px] border-t border-border pt-3 flex-wrap">
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

          {organizer && (
            <label
              className={cn(
                "inline-flex items-center gap-1.5 cursor-pointer text-sm transition-colors",
                asAnnouncement
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Post this as an official announcement"
            >
              <input
                type="checkbox"
                checked={asAnnouncement}
                onChange={(e) => setAsAnnouncement(e.target.checked)}
                className="sr-only"
              />
              <Megaphone className="size-4" />
              <span className="hidden sm:inline">Announcement</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline">
            {AOS_HASHTAG_DISPLAY}
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
