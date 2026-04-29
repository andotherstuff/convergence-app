import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import data from "@emoji-mart/data";
// emoji-mart ships untyped in its bundled entry — import as any and cast.
// We only use `new Picker(options)` here.
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

/**
 * Resolve the effective light/dark theme mode. If the user picked "system",
 * fall back to the OS preference.
 */
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
 * Emoji picker powered by emoji-mart. Manages the picker web component
 * imperatively (mirrors Ditto's pattern) to avoid the "Illegal constructor"
 * error that `@emoji-mart/react` hits under React Strict Mode or when
 * popovers remount.
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
      dynamicWidth: true,
      parent: container,
      autoFocus: !isMobile,
    };

    // emoji-mart's Picker is a custom element. Construct it and let it
    // append itself to our container.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = new (Picker as any)(pickerOptions);

    // Inject theme-matched styles into the picker's shadow root so it
    // blends with the app's colors instead of emoji-mart's defaults.
    requestAnimationFrame(() => {
      const shadowRoot = (container.firstChild as HTMLElement)?.shadowRoot;
      if (!shadowRoot) return;
      const style = document.createElement("style");
      style.textContent = [
        ":host { width: 100% !important; height: 340px !important; min-height: 200px !important; border-radius: 0 !important; box-shadow: none !important; --background-rgb: 0,0,0 !important; }",
        "#root { width: 100% !important; background-color: transparent !important; }",
        ".scroll { padding-right: var(--padding) !important; }",
        ".sticky { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: transparent !important; color: var(--color-b) !important; font-size: 10px !important; text-transform: uppercase !important; letter-spacing: 0.12em !important; }",
        // Search input
        ".search input[type='search'] { background-color: transparent !important; border: 1px solid var(--rgb-background, rgba(0,0,0,0.1)) !important; border-radius: 0.5rem !important; padding: 0.5rem 2rem 0.5rem 2.2rem !important; height: 34px !important; font-size: 14px !important; }",
        "input { font-size: 16px !important; }", // prevent iOS zoom
        // Nav icons
        "#nav { flex-shrink: 0 !important; overflow: visible !important; padding: 4px !important; }",
        "#nav button { overflow: visible !important; }",
        // Scrollbar
        ".scroll::-webkit-scrollbar { width: 6px !important; }",
        ".scroll::-webkit-scrollbar-thumb { background-color: transparent !important; border-radius: 9999px !important; }",
        ".scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(128,128,128,0.3) !important; }",
        ".scroll::-webkit-scrollbar-track { background: transparent !important; }",
      ].join(" ");
      shadowRoot.appendChild(style);
    });

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [open, resolvedMode, isMobile, handleSelect]);

  // Wrap onSelect to also close the popover
  useEffect(() => {
    const original = onSelect;
    onSelectRef.current = (emoji: string) => {
      original(emoji);
      setOpen(false);
    };
  }, [onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0 overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <div
          ref={containerRef}
          className="w-full"
          style={{ isolation: "isolate" }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        />
      </PopoverContent>
    </Popover>
  );
}
