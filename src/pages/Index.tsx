import { useEffect, useMemo, useState } from "react";
import { useSeoMeta } from "@unhead/react";
import { useInView } from "react-intersection-observer";
import { Megaphone, MessagesSquare } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Compose } from "@/components/feed/Compose";
import { FeedItem } from "@/components/feed/FeedItem";
import { FeedPostSkeleton } from "@/components/feed/FeedPost";
import { useAosFeed, type FeedMode } from "@/hooks/useAosFeed";
import { AOS_HASHTAG_DISPLAY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Index = () => {
  useSeoMeta({
    title: "AOS Convergence · Oslo 2026",
    description:
      "A curated three-day gathering for builders, researchers, funders, and community leaders working to expand human agency through open systems.",
  });

  const [mode, setMode] = useState<FeedMode>("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useAosFeed(mode);

  const { ref, inView } = useInView({ rootMargin: "400px 0px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flat().filter((event) => {
        if (!event.id || seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      }) ?? []
    );
  }, [data?.pages]);

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-24">
        <header className="mb-6 md:mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="aos-kicker mb-2">The Feed</div>
            <h1 className="aos-display text-3xl md:text-4xl">
              {AOS_HASHTAG_DISPLAY}
            </h1>
          </div>

          {/* Mode toggle — segmented control */}
          <div
            role="tablist"
            aria-label="Feed filter"
            className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-background shadow-sm"
          >
            <ModeButton
              active={mode === "all"}
              onClick={() => setMode("all")}
              icon={<MessagesSquare className="size-3.5" />}
              label="All"
            />
            <ModeButton
              active={mode === "announcements"}
              onClick={() => setMode("announcements")}
              icon={<Megaphone className="size-3.5" />}
              label="Announcements"
            />
          </div>
        </header>

        {mode === "all" && (
          <div className="mb-4 md:mb-5">
            <Compose />
          </div>
        )}

        {isError && (
          <div className="aos-card border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't load the feed. Check your relay connection and try
              again.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-base font-medium text-foreground mb-2">
              {mode === "announcements"
                ? "No announcements yet"
                : "No posts yet"}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {mode === "announcements"
                ? "When organizers post official updates tagged " +
                  AOS_HASHTAG_DISPLAY +
                  " and #Announcement, they'll appear here."
                : `Be the first to share something with the convergence community. Post anything tagged ${AOS_HASHTAG_DISPLAY} and it'll show up here.`}
            </p>
          </div>
        )}

        {(isLoading || items.length > 0) && (
          <div className="aos-feed-list">
            {isLoading && (
              <>
                <FeedPostSkeleton />
                <FeedPostSkeleton />
                <FeedPostSkeleton />
              </>
            )}
            {items.map((event) => (
              <FeedItem key={event.id} event={event} />
            ))}
            {hasNextPage && (
              <div ref={ref} className="py-4">
                {isFetchingNextPage && <FeedPostSkeleton />}
              </div>
            )}
          </div>
        )}

        {!hasNextPage && items.length > 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            You've reached the beginning.
          </div>
        )}

        {!hasNextPage && items.length >= 10 && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </Button>
          </div>
        )}
      </section>
    </Layout>
  );
};

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ModeButton({ active, onClick, icon, label }: ModeButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default Index;
