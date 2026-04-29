import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import data from "@emoji-mart/data";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { Picker } from "emoji-mart";
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
 * Emoji picker powered by emoji-mart. Constructs the Picker custom
 * element imperatively (Ditto pattern) to sidestep the "Illegal
 * constructor" error `@emoji-mart/react` can hit under popover
 * remount cycles.
 *
 * The picker is given its native default width (~352px); we size the
 * popover to match. Any attempt to force emoji-mart into 100% width
 * via `:host` overrides proved unreliable because its shadow root
 * attaches asynchronously during `connectedCallback`.
 */
export function EmojiPicker({ children, onSelect, disabled }: EmojiPickerProps) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const resolvedMode = resolveMode(theme);

  const handleSelect = useCallback((emoji: EmojiMartEmoji) => {
    if (emoji.native) {
      onSelectRef.current(emoji.native);
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const pickerOptions = {
      data,
      onEmojiSelect: handleSelect,
      theme: resolvedMode,
      previewPosition: "none",
      skinTonePosition: "search",
      set: "native",
      maxFrequentRows: 1,
      navPosition: "top",
      autoFocus: !isMobile,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = new (Picker as any)(pickerOptions) as HTMLElement;
    container.appendChild(picker);

    return () => {
      if (picker.parentNode === container) {
        container.removeChild(picker);
      }
    };
  }, [open, resolvedMode, isMobile, handleSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 overflow-hidden border-0 bg-transparent shadow-none z-50"
        align="start"
        sideOffset={6}
      >
        <div
          ref={containerRef}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        />
      </PopoverContent>
    </Popover>
  );
}
