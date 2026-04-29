import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  children: ReactNode;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

/**
 * Curated reaction emoji palette. A small, fast, reliable alternative
 * to a full emoji keyboard — which is the right UX for reactions
 * anyway (Slack/Discord/Twitter/Mastodon all surface a short palette
 * first). Grouped by mood so users can scan quickly.
 */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Common",
    emojis: ["👍", "❤️", "🔥", "😂", "🎉", "🙌", "👏", "💯"],
  },
  {
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😊",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗",
      "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑",
      "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑",
      "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
      "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🥵", "🥶", "🥴", "😵", "🤯", "🥳", "😎", "🤓",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "👐",
      "🤲", "🤝", "🙏", "💪", "🦾", "✍️", "💅", "🤳",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "💌", "💋", "💐", "🌹",
    ],
  },
  {
    label: "Symbols",
    emojis: [
      "🔥", "✨", "⭐", "🌟", "💫", "💥", "💢", "💦",
      "💨", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈",
      "🥉", "🏅", "🎖️", "🌈", "☀️", "🌙", "⚡", "☄️",
      "💯", "✅", "❌", "⚠️", "🚀", "💎", "👑", "🎯",
    ],
  },
  {
    label: "Animals",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
      "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
      "🦄", "🐝", "🦋", "🐙", "🦑", "🐳", "🐬", "🦈",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇",
      "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥",
      "🥑", "🥦", "🥕", "🌽", "🍆", "🥔", "🍕", "🍔",
      "🍟", "🌭", "🍿", "🥨", "🍩", "🍪", "🎂", "🍰",
      "🍦", "🍭", "☕", "🍵", "🍶", "🍺", "🍷", "🥂",
    ],
  },
];

export function EmojiPicker({ children, onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <div className="flex items-center gap-1 p-1.5 border-b border-border overflow-x-auto">
          {EMOJI_GROUPS.map((group, i) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(i)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                i === activeGroup
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="p-2 max-h-[280px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_GROUPS[activeGroup].emojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="aspect-square flex items-center justify-center text-xl rounded-md hover:bg-secondary transition-colors"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
