import { useEffect, useMemo } from "react";
import { useSeoMeta } from "@unhead/react";
import { useInView } from "react-intersection-observer";
import { Layout } from "@/components/layout/Layout";
import { Compose } from "@/components/feed/Compose";
import { FeedItem } from "@/components/feed/FeedItem";
import { FeedPostSkeleton } from "@/components/feed/FeedPost";
import { NewPostsBanner } from "@/components/feed/NewPostsBanner";
import { useAosFeed } from "@/hooks/useAosFeed";
import { useAosLiveStream } from "@/hooks/useAosLiveStream";
import { AOS_HASHTAG_DISPLAY, PROGRAM_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { CalendarDays, ExternalLink } from "lucide-react";

const Index = () => {
  useSeoMeta({
    title: "AOS Convergence · Oslo 2026",
    description:
      "A curated three-day gathering for builders, researchers, funders, and community leaders working to expand human agency through open systems.",
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useAosFeed("all");

  const { pendingCount, flush } = useAosLiveStream("all");

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
        <header className="mb-6 md:mb-8">
          {/* Top row: kicker on the left, Program pill on the right.
              The pill hugs the kicker baseline on every breakpoint
              (instead of dropping to the bottom of a tall headline on
              narrow screens), which keeps it sitting neatly in the
              empty space above the #AOSConvergence headline on mobile. */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="aos-kicker">The Feed</div>

            {/* Quick access to the canonical schedule. Prominent on the
                landing page because it's the single most-referenced
                link during the event. Opens in a new tab so the user's
                feed stays intact. */}
            <a
              href={PROGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors shadow-xs shrink-0"
            >
              <CalendarDays className="size-4" />
              <span>Program</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
          </div>

          <h1 className="aos-display text-3xl md:text-4xl">
            {AOS_HASHTAG_DISPLAY}
          </h1>
        </header>

        <div className="mb-4 md:mb-5">
          <Compose />
        </div>

        <NewPostsBanner count={pendingCount} onClick={flush} />

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
              No posts yet
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Be the first to share something with the convergence community.
              Post anything tagged {AOS_HASHTAG_DISPLAY} and it'll show up
              here.
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

export default Index;
