import { useState } from "react";
import { SmilePlus } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useReactions } from "@/hooks/useReactions";
import { useReact, type ReactionInput } from "@/hooks/useReact";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { CustomEmojiImg } from "@/components/CustomEmoji";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";

interface ReactionBarProps {
  target: NostrEvent;
  /** Compact size variant used in tight contexts (nested comments). */
  size?: "default" | "sm";
  className?: string;
}

export function ReactionBar({
  target,
  size = "default",
  className,
}: ReactionBarProps) {
  const { user } = useCurrentUser();
  const { data: groups = [] } = useReactions(target);
  const { mutate: react, isPending } = useReact();
  const { toast } = useToast();

  // Tracks the pill that the user just tapped so we can dim only it
  // during the in-flight publish. Keyed on the display string (emoji
  // or `:shortcode:`).
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

  const handleClick = (input: ReactionInput, existingId?: string) => {
    if (!user) {
      toast({
        title: "Sign in to react",
        description: "You need a Nostr account to add reactions.",
      });
      return;
    }
    // Both forms reduce to a stable display string for the loading flag.
    const displayKey =
      typeof input === "string" ? input : `:${input.shortcode}:`;
    setActiveEmoji(displayKey);
    react(
      { target, emoji: input, existingId },
      {
        onSettled: () => setActiveEmoji(null),
        onError: (err) => {
          toast({
            title: "Couldn't react",
            description:
              err instanceof Error ? err.message : String(err),
            variant: "destructive",
          });
        },
      }
    );
  };

  const pillClasses = cn(
    "inline-flex items-center gap-1 rounded-full border transition-colors",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[0.8rem]"
  );

  const inactive =
    "border-border bg-background hover:bg-secondary text-foreground";
  const active =
    "border-foreground bg-foreground text-background hover:bg-foreground/90";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {groups.map((g) => {
        const isLoadingThis = isPending && activeEmoji === g.emoji;
        const isCustom = !!g.url;
        // When toggling off, we don't need the URL — only the existing
        // event id matters. When adding the same custom-emoji reaction,
        // we replay the original {shortcode, url} so the new event is
        // also NIP-30-valid.
        const input: ReactionInput =
          isCustom && g.name && g.url
            ? { shortcode: g.name, url: g.url }
            : g.emoji;
        return (
          <button
            key={g.emoji}
            type="button"
            disabled={isPending}
            onClick={() => handleClick(input, g.mine ? g.myEvent?.id : undefined)}
            className={cn(pillClasses, g.mine ? active : inactive)}
            aria-pressed={g.mine}
            title={
              g.mine
                ? `Remove ${g.emoji} reaction`
                : `React with ${g.emoji}`
            }
          >
            {isCustom && g.url && g.name ? (
              <CustomEmojiImg
                name={g.name}
                url={g.url}
                className={cn(
                  // Pin pixel sizes so the image lines up cleanly with
                  // the count regardless of the surrounding font size.
                  size === "sm" ? "h-4 w-4" : "h-[1.05rem] w-[1.05rem]",
                  "align-middle",
                  isLoadingThis && "opacity-60",
                )}
              />
            ) : (
              <span
                className={cn(
                  "font-emoji leading-none",
                  size === "sm" ? "text-sm" : "text-base",
                  isLoadingThis && "opacity-60"
                )}
              >
                {g.emoji}
              </span>
            )}
            <span className="tabular-nums font-medium">{g.count}</span>
          </button>
        );
      })}

      <EmojiPicker
        onSelect={(emoji) => {
          // If user already has this emoji, toggle off. Otherwise add.
          const existing = groups.find((g) => g.emoji === emoji && g.mine);
          handleClick(emoji, existing?.myEvent?.id);
        }}
      >
        <button
          type="button"
          className={cn(
            pillClasses,
            inactive,
            "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Add reaction"
          title="Add reaction"
        >
          <SmilePlus className={size === "sm" ? "size-3.5" : "size-4"} />
        </button>
      </EmojiPicker>
    </div>
  );
}
