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

/** Shadow-DOM overrides for emoji-mart to match app theming. */
const PICKER_SHADOW_CSS = [
  ":host { width: 100% !important; height: 340px !important; min-height: 200px !important; border-radius: 0 !important; box-shadow: none !important; }",
  "#root { width: 100% !important; background-color: transparent !important; }",
  ".scroll { padding-right: var(--padding) !important; }",
  ".sticky { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: transparent !important; font-size: 10px !important; text-transform: uppercase !important; letter-spacing: 0.12em !important; }",
  "input { font-size: 16px !important; }", // prevent iOS zoom
  ".search input[type='search'] { border-radius: 0.5rem !important; padding: 0.5rem 2rem 0.5rem 2.2rem !important; height: 34px !important; }",
  "#nav { flex-shrink: 0 !important; overflow: visible !important; padding: 4px !important; }",
  "#nav button { overflow: visible !important; }",
  ".scroll::-webkit-scrollbar { width: 6px !important; }",
  ".scroll::-webkit-scrollbar-thumb { background-color: transparent !important; border-radius: 9999px !important; }",
  ".scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(128,128,128,0.3) !important; }",
  ".scroll::-webkit-scrollbar-track { background: transparent !important; }",
].join(" ");

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
 * Inject shadow-DOM CSS once the picker's shadow root is attached.
 * Retries on animation frames until the shadow root appears (emoji-mart
 * attaches it asynchronously in `connectedCallback`).
 */
function injectShadowStyles(host: HTMLElement, signal: { cancelled: boolean }) {
  let attempts = 0;
  const tryInject = () => {
    if (signal.cancelled) return;
    const shadowRoot = host.shadowRoot;
    if (shadowRoot) {
      if (shadowRoot.querySelector("style[data-aos-emoji-picker]")) return;
      const style = document.createElement("style");
      style.setAttribute("data-aos-emoji-picker", "");
      style.textContent = PICKER_SHADOW_CSS;
      shadowRoot.appendChild(style);
      return;
    }
    if (attempts++ < 30) {
      requestAnimationFrame(tryInject);
    }
  };
  tryInject();
}

/**
 * Emoji picker powered by emoji-mart. Uses the imperative Picker
 * constructor inside a ref-managed div (the Ditto pattern) to avoid
 * "Illegal constructor" errors under Strict Mode / popover remount.
 */
export function EmojiPicker({ children, onSelect, disabled }: EmojiPickerProps) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const resolvedMode = resolveMode(theme);

  const handleSelect = useCallback(
    (emoji: EmojiMartEmoji) => {
      if (emoji.native) {
        onSelectRef.current(emoji.native);
        setOpen(false);
      }
    },
    []
  );

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
      autoFocus: !isMobile,
    };

    // Construct the picker — it's a custom element that extends HTMLElement.
    // We append it to the container ourselves for reliable mount.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = new (Picker as any)(pickerOptions) as HTMLElement;
    container.appendChild(picker);

    // emoji-mart sets its own inline :host styles; nudge it to fill the box.
    picker.style.width = "100%";
    picker.style.display = "block";

    const signal = { cancelled: false };
    injectShadowStyles(picker, signal);

    return () => {
      signal.cancelled = true;
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
        className="w-[340px] p-0 overflow-hidden z-50"
        align="start"
        sideOffset={6}
      >
        <div
          ref={containerRef}
          className="w-full"
          style={{
            isolation: "isolate",
            width: "100%",
            minHeight: "340px",
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        />
      </PopoverContent>
    </Popover>
  );
}
