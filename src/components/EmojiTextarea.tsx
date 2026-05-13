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
import { nip19 } from "nostr-tools";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileSearch, type ProfileCandidate } from "@/hooks/useProfileSearch";
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

type Token =
  | { kind: "emoji"; start: number; query: string }
  | { kind: "mention"; start: number; query: string };

type Suggestion =
  | {
      kind: "emoji";
      id: string;
      native: string;
      shortcode: string;
    }
  | {
      kind: "mention";
      pubkey: string;
      name: string;
      displayName: string;
      nip05?: string;
      picture?: string;
    };

/**
 * Walk backwards from the caret to find the active token. Two shapes
 * are recognized:
 *
 *  - `:query`  — emoji shortcode autocomplete.
 *  - `@query`  — Nostr profile mention autocomplete.
 *
 * Returns `null` when the caret isn't inside an open token, or when
 * the token's preceding character makes the match ambiguous (e.g. an
 * `@` immediately after a letter, which is more likely an email
 * fragment than the start of a mention).
 */
function getActiveToken(value: string, caret: number): Token | null {
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i];
    if (ch === ":" || ch === "@") {
      const query = value.slice(i + 1, caret);

      // Per-shape character class for the query body. Emoji shortcodes
      // accept alphanumerics + `_` `+` `-`. Mentions accept any printable
      // non-whitespace so users can type partial display names with
      // dots, dashes, etc.
      const okEmoji = /^[A-Za-z0-9_+-]{1,}$/.test(query);
      const okMention = /^[^\s:@]{1,}$/.test(query);

      const kind: Token["kind"] | null =
        ch === ":" ? (okEmoji ? "emoji" : null) : okMention ? "mention" : null;
      if (!kind) return null;

      // The trigger char must be at the start of the input or preceded
      // by whitespace or a non-word character — otherwise we might be
      // matching inside a URL (http://) or an email address.
      if (i > 0) {
        const prev = value[i - 1];
        if (/[A-Za-z0-9]/.test(prev)) return null;
      }

      return { kind, start: i, query };
    }
    // Stop scanning at whitespace or after a reasonable lookback.
    if (/\s/.test(ch) || caret - i > 40) return null;
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
      out.push({ kind: "emoji", id: e.id, native, shortcode });
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return [];
  }
}

function profilesToSuggestions(profiles: ProfileCandidate[]): Suggestion[] {
  return profiles.map((p) => ({
    kind: "mention",
    pubkey: p.pubkey,
    name: p.name,
    displayName: p.displayName,
    nip05: p.nip05,
    picture: p.picture,
  }));
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
  /**
   * Pubkeys whose profiles should be eagerly fetched on mount so they
   * surface in the `@mention` dropdown even if React Query hasn't
   * already cached them. Typically the authors of the surrounding
   * feed / thread.
   */
  mentionSeedPubkeys?: string[];
}

/**
 * Textarea wrapper that surfaces two inline autocompletes:
 *
 *  - `:shortcode` → emoji insertion.
 *  - `@query`      → Nostr profile mention. On select, inserts a
 *    `nostr:npub1…` URI which `NoteContent` renders as a profile link,
 *    and the publisher derives a `p` tag from at submit time (see
 *    {@link extractMentionedPubkeys}).
 *
 * The two share a single dropdown panel; only one can be active at a
 * time (which one is determined by the trigger character `:` vs `@`).
 */
export const EmojiTextarea = forwardRef<EmojiTextareaHandle, EmojiTextareaProps>(
  function EmojiTextarea(
    { value, onChange, onKeyDown, className, mentionSeedPubkeys, ...rest },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [token, setToken] = useState<Token | null>(null);
    const [emojiSuggestions, setEmojiSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // Live profile search for the current `@mention` query.
    const mentionQuery = token?.kind === "mention" ? token.query : "";
    const profileCandidates = useProfileSearch({
      query: mentionQuery,
      seedPubkeys: mentionSeedPubkeys ?? [],
      limit: 6,
    });

    const suggestions: Suggestion[] =
      token?.kind === "mention"
        ? profilesToSuggestions(profileCandidates)
        : emojiSuggestions;

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        blur: () => textareaRef.current?.blur(),
        get element() {
          return textareaRef.current;
        },
      }),
      [],
    );

    const clearSuggestions = useCallback(() => {
      setEmojiSuggestions([]);
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
        setActiveIndex(0);
        if (active.kind === "emoji") {
          const results = await searchEmojis(active.query);
          setEmojiSuggestions(results);
        } else {
          // Mention suggestions are derived synchronously from the
          // useProfileSearch hook output — nothing to do here.
          setEmojiSuggestions([]);
        }
      },
      [clearSuggestions],
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

        // Each token kind has its own replacement shape.
        const inserted =
          s.kind === "emoji"
            ? `${s.native} `
            : `nostr:${nip19.npubEncode(s.pubkey)} `;

        const next = `${before}${inserted}${after}`;
        onChange(next);
        clearSuggestions();
        // Restore caret just after the inserted text.
        requestAnimationFrame(() => {
          const pos = before.length + inserted.length;
          el.setSelectionRange(pos, pos);
          el.focus();
        });
      },
      [clearSuggestions, onChange, token, value],
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
            (i) => (i - 1 + suggestions.length) % suggestions.length,
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
            aria-label={
              token?.kind === "mention"
                ? "People suggestions"
                : "Emoji suggestions"
            }
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-w-sm"
          >
            {suggestions.map((s, i) => (
              <button
                key={s.kind === "emoji" ? s.id : s.pubkey}
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
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                {s.kind === "emoji" ? (
                  <>
                    <span className="font-emoji text-lg leading-none">
                      {s.native}
                    </span>
                    <span className="truncate font-mono text-xs">
                      {s.shortcode}
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={s.picture} alt={s.name} />
                      <AvatarFallback className="text-[0.6rem] bg-secondary">
                        {s.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm text-foreground font-medium">
                      {s.displayName || s.name}
                    </span>
                    {s.nip05 && (
                      <span className="truncate text-xs text-muted-foreground hidden sm:inline">
                        {s.nip05.replace(/^_@/, "")}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
