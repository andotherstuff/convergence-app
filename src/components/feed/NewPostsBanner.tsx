import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
  className?: string;
}

/**
 * Sticky "N new posts — show" banner shown above the feed when the
 * live-streaming subscription has buffered events waiting to be
 * prepended. Clicking the banner flushes the buffer and scrolls the
 * user back to the top of the feed.
 *
 * Rendering nothing when `count === 0` keeps the DOM quiet and
 * preserves layout (no flash of empty space on initial mount).
 */
export function NewPostsBanner({
  count,
  onClick,
  className,
}: NewPostsBannerProps) {
  if (count <= 0) return null;

  const label =
    count === 1 ? "1 new post" : `${count > 99 ? "99+" : count} new posts`;

  const handleClick = () => {
    onClick();
    // Defer the scroll so the freshly-injected items are already in
    // the DOM and layout isn't fighting the smooth scroll.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <div
      className={cn(
        "sticky top-16 md:top-20 z-20 flex justify-center mb-3 md:mb-4",
        "pointer-events-none",
        className
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Show ${label}`}
        className={cn(
          "pointer-events-auto",
          "inline-flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-foreground text-background shadow-lg",
          "text-sm font-medium",
          "transition-transform hover:scale-[1.02] active:scale-[0.98]",
          "animate-in fade-in-0 slide-in-from-top-2 duration-200"
        )}
      >
        <ArrowUp className="size-4" strokeWidth={2.5} />
        <span>{label}</span>
      </button>
    </div>
  );
}
