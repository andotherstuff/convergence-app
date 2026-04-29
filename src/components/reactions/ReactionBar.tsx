import { useState } from "react";
import { SmilePlus } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useReactions } from "@/hooks/useReactions";
import { useReact } from "@/hooks/useReact";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
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
  const { data: groups = [], isLoading } = useReactions(target);
  const { mutate: react, isPending } = useReact();
  const { toast } = useToast();

  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);

  const handleClick = (emoji: string, existingId?: string) => {
    if (!user) {
      toast({
        title: "Sign in to react",
        description: "You need a Nostr account to add reactions.",
      });
      return;
    }
    if (user.pubkey === target.pubkey && !existingId) {
      // Allow self-reaction if they want — but in practice discourage it.
      // Most clients allow it; we allow it here too.
    }
    setActiveEmoji(emoji);
    react(
      { target, emoji, existingId },
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
        return (
          <button
            key={g.emoji}
            type="button"
            disabled={isPending}
            onClick={() => handleClick(g.emoji, g.mine ? g.myEvent?.id : undefined)}
            className={cn(pillClasses, g.mine ? active : inactive)}
            aria-pressed={g.mine}
            title={
              g.mine
                ? `Remove ${g.emoji} reaction`
                : `React with ${g.emoji}`
            }
          >
            <span
              className={cn(
                size === "sm" ? "text-sm" : "text-base",
                isLoadingThis && "opacity-60"
              )}
            >
              {g.emoji}
            </span>
            <span className="tabular-nums font-medium">{g.count}</span>
          </button>
        );
      })}

      <EmojiPicker
        disabled={isPending || isLoading}
        onSelect={(emoji) => {
          // If user already has this emoji, toggle off. Otherwise add.
          const existing = groups.find((g) => g.emoji === emoji && g.mine);
          handleClick(emoji, existing?.myEvent?.id);
        }}
      >
        <button
          type="button"
          disabled={isPending || isLoading}
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
