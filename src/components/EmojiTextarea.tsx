import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// emoji-mart's SearchIndex needs to be initialized with the data bundle
// before `SearchIndex.search()` returns results. Calling init() multiple
// times is a no-op, so it's safe to invoke at module load.
void init({ data });

interface EmojiMartEmoji {
  id: string;
  name?: string;
  native?: string;
  skins?: Array<{ native?: string; shortcodes?: string }>;
  shortcodes?: string;
}

interface Suggestion {
  id: string;
  native: string;
  shortcode: string;
}

/** Find the active `:query` token directly before the caret. Returns
 *  the match start index and the query (without the leading ':') or
 *  `null` if the caret isn't currently inside a shortcode token. */
function getActiveToken(
  value: string,
  caret: number
): { start: number; query: string } | null {
  // Walk backwards from the caret until we hit a ':' or a stop character.
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i];
    if (ch === ":") {
      const query = value.slice(i + 1, caret);
      // Must have at least one character and only shortcode-safe chars.
      if (!/^[A-Za-z0-9_+\-]{1,}$/.test(query)) return null;
      // The ':' must be at the start of the input or preceded by whitespace
      // or a non-word character — otherwise we might be matching inside
      // something like a URL (http://).
      if (i > 0) {
        const prev = value[i - 1];
        if (/[A-Za-z0-9]/.test(prev)) return null;
      }
      return { start: i, query };
    }
    // Stop scanning at whitespace, another colon (already closed), or too far back.
    if (/\s/.test(ch) || caret - i > 30) return null;
    i -= 1;
  }
  return null;
}

async function searchEmojis(query: string): Promise<Suggestion[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (await (SearchIndex as any).search(query)) as
      | EmojiMartEmoji[]
      | null;
    if (!results) return [];
    const out: Suggestion[] = [];
    for (const e of results) {
      const native = e.skins?.[0]?.native ?? e.native;
      if (!native) continue;
      const shortcode =
        e.skins?.[0]?.shortcodes ?? e.shortcodes ?? `:${e.id}:`;
      out.push({ id: e.id, native, shortcode });
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return [];
  }
}

export interface EmojiTextareaHandle {
  focus: () => void;
  blur: () => void;
  element: HTMLTextAreaElement | null;
}

type BaseProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
>;

interface EmojiTextareaProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Textarea wrapper that surfaces an inline `:shortcode:` emoji
 * autocomplete. Otherwise behaves like a regular controlled textarea.
 */
export const EmojiTextarea = forwardRef<EmojiTextareaHandle, EmojiTextareaProps>(
  function EmojiTextarea(
    { value, onChange, onKeyDown, className, ...rest },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [token, setToken] = useState<{ start: number; query: string } | null>(
      null
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        blur: () => textareaRef.current?.blur(),
        get element() {
          return textareaRef.current;
        },
      }),
      []
    );

    const clearSuggestions = useCallback(() => {
      setSuggestions([]);
      setActiveIndex(0);
      setToken(null);
    }, []);

    // Re-run token detection + search whenever the text or caret moves.
    const refreshSuggestions = useCallback(
      async (nextValue: string, caret: number) => {
        const active = getActiveToken(nextValue, caret);
        if (!active) {
          clearSuggestions();
          return;
        }
        setToken(active);
        const results = await searchEmojis(active.query);
        setSuggestions(results);
        setActiveIndex(0);
      },
      [clearSuggestions]
    );

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      onChange(next);
      const caret = e.target.selectionStart ?? next.length;
      void refreshSuggestions(next, caret);
    };

    const handleSelectionChange = () => {
      const el = textareaRef.current;
      if (!el) return;
      void refreshSuggestions(el.value, el.selectionStart ?? el.value.length);
    };

    const insertSuggestion = useCallback(
      (s: Suggestion) => {
        const el = textareaRef.current;
        if (!el || !token) return;
        const caret = el.selectionStart ?? el.value.length;
        const before = value.slice(0, token.start);
        const after = value.slice(caret);
        // Replace ":query" with "native " (trailing space for convenience)
        const inserted = `${s.native} `;
        const next = `${before}${inserted}${after}`;
        onChange(next);
        clearSuggestions();
        // Restore caret just after the inserted emoji+space.
        requestAnimationFrame(() => {
          const pos = before.length + inserted.length;
          el.setSelectionRange(pos, pos);
          el.focus();
        });
      },
      [clearSuggestions, onChange, token, value]
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex(
            (i) => (i - 1 + suggestions.length) % suggestions.length
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertSuggestion(suggestions[activeIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          clearSuggestions();
          return;
        }
      }
      onKeyDown?.(e);
    };

    // Close the suggestion list on outside interactions.
    useEffect(() => {
      if (suggestions.length === 0) return;
      const handleDown = (e: MouseEvent) => {
        const el = textareaRef.current;
        if (!el) return;
        const target = e.target as Node | null;
        if (target && el.contains(target)) return;
        // Clicks on the suggestion panel are handled via mousedown on the
        // buttons themselves (preventDefault keeps focus on the textarea).
        // Anything else closes the panel.
        const panel = document.getElementById("emoji-textarea-suggestions");
        if (panel && target && panel.contains(target)) return;
        clearSuggestions();
      };
      document.addEventListener("mousedown", handleDown);
      return () => document.removeEventListener("mousedown", handleDown);
    }, [clearSuggestions, suggestions.length]);

    return (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          className={className}
          {...rest}
        />
        {suggestions.length > 0 && (
          <div
            id="emoji-textarea-suggestions"
            role="listbox"
            aria-label="Emoji suggestions"
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-w-sm"
          >
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  // Prevent textarea blur
                  e.preventDefault();
                  insertSuggestion(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors",
                  i === activeIndex
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                <span className="font-emoji text-lg leading-none">
                  {s.native}
                </span>
                <span className="truncate font-mono text-xs">
                  {s.shortcode}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
