import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Curated emoji set — top-used reactions. Kept small to avoid shipping a
// full Unicode database; users can still type any emoji into the search
// box at the bottom of the picker.
const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: [
      "😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "🙃", "😅",
      "😢", "😭", "🥹", "😡", "🤯", "🤩", "🫡", "😬", "🥳", "🤗",
    ],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖"],
  },
  {
    name: "Hands",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👊", "🤝", "✌️", "🤞", "🫶",
      "💪", "🤘", "👋", "🤙",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "🔥", "✨", "⭐", "🌟", "💯", "✅", "❌", "⚡", "🎉", "🎊",
      "🚀", "💡", "🎯", "👀", "💭", "💫",
    ],
  },
  {
    name: "Objects",
    emojis: ["📝", "📚", "🔧", "⚙️", "🛠️", "🧠", "💻", "📱", "💰", "🎨"],
  },
];

interface EmojiPickerProps {
  children: ReactNode;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ children, onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setCustom("");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = custom.trim();
    if (!trimmed) return;
    // Take just the first grapheme so users can't smuggle multi-char strings.
    const first = Array.from(trimmed)[0];
    if (first) handleSelect(first);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <div className="max-h-[320px] overflow-y-auto px-2 py-2">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.name} className="mb-2 last:mb-0">
              <div className="px-1.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                {cat.name}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cat.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleSelect(e)}
                    className="size-9 rounded-md hover:bg-secondary focus-visible:bg-secondary flex items-center justify-center text-xl transition-colors"
                    aria-label={`React with ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={handleCustomSubmit}
          className="border-t border-border p-2 flex gap-1.5"
        >
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Type any emoji…"
            className="h-8 text-sm"
            maxLength={8}
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            className="px-2.5 text-xs font-medium rounded-md bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
