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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AOS_HASHTAG_DISPLAY, isOrganizer } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const Announcements = () => {
  useSeoMeta({
    title: "Announcements · AOS Convergence",
    description:
      "Official updates from the AOS Convergence organizers. The canonical source for program changes, logistics, and event news.",
  });

  const { user } = useCurrentUser();
  const viewerIsOrganizer = !!user && isOrganizer(user.pubkey);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useAosFeed("announcements");

  const { pendingCount, flush } = useAosLiveStream("announcements");

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
          <div className="aos-kicker mb-2">Organizer Updates</div>
          <h1 className="aos-display text-3xl md:text-4xl">Announcements</h1>
        </header>

        {/* Only organizers can compose an announcement */}
        {viewerIsOrganizer && (
          <div className="mb-4 md:mb-5">
            <Compose announcement />
          </div>
        )}

        <NewPostsBanner count={pendingCount} onClick={flush} />

        {isError && (
          <div className="aos-card border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't load announcements. Check your relay connection and try
              again.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-base font-medium text-foreground mb-2">
              No announcements yet
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              When organizers post official updates tagged{" "}
              {AOS_HASHTAG_DISPLAY} and #Announcement, they'll appear here.
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

export default Announcements;
