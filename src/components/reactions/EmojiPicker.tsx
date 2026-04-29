import { useState, type ReactNode } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/hooks/useTheme";

interface EmojiMartEmoji {
  id: string;
  native?: string;
  shortcodes?: string;
}

interface EmojiPickerProps {
  children: ReactNode;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

/** Resolve the effective light/dark theme. */
function resolveMode(theme: "light" | "dark" | "system"): "light" | "dark" {
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/**
 * Full emoji keyboard powered by emoji-mart's React wrapper.
 * Includes search, category navigation, skin tone support, and the
 * full native emoji set.
 */
export function EmojiPicker({ children, onSelect, disabled }: EmojiPickerProps) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const resolvedMode = resolveMode(theme);

  const handleSelect = (emoji: EmojiMartEmoji) => {
    if (emoji.native) {
      onSelect(emoji.native);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 overflow-hidden border-0 bg-transparent shadow-none"
        align="start"
        sideOffset={6}
      >
        <Picker
          data={data}
          onEmojiSelect={handleSelect}
          theme={resolvedMode}
          previewPosition="none"
          skinTonePosition="search"
          set="native"
          maxFrequentRows={1}
          navPosition="bottom"
          autoFocus={!isMobile}
        />
      </PopoverContent>
    </Popover>
  );
}
