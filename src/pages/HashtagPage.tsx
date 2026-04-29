import { useEffect, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { useInView } from "react-intersection-observer";
import { Hash } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Compose } from "@/components/feed/Compose";
import { FeedPost, FeedPostSkeleton } from "@/components/feed/FeedPost";
import { useHashtagFeed } from "@/hooks/useHashtagFeed";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";

const HashtagPage = () => {
  const { hashtag } = useParams<{ hashtag: string }>();

  if (!hashtag) return <NotFound />;

  // Normalize. Nostr `t` tags are lowercase by convention.
  const lower = hashtag.toLowerCase();
  // Preserve the original casing for display (users may write
  // `#AOSConvergence` vs `#aosconvergence`), but always query lowercase.
  const display = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;

  // Basic safety: only allow standard tag characters.
  if (!/^[\p{L}\p{N}_-]+$/u.test(lower)) {
    return <Navigate to="/" replace />;
  }

  return <HashtagFeedInner key={lower} lower={lower} display={display} />;
};

function HashtagFeedInner({
  lower,
  display,
}: {
  lower: string;
  display: string;
}) {
  useSeoMeta({
    title: `${display} · AOS Convergence`,
    description: `Notes tagged ${display} on Nostr.`,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useHashtagFeed(lower);

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
          <div className="aos-kicker mb-2 inline-flex items-center gap-1.5">
            <Hash className="size-3" />
            Hashtag
          </div>
          <h1 className="aos-display text-3xl md:text-4xl break-words">
            {display}
          </h1>
        </header>

        <div className="mb-4 md:mb-5">
          <Compose
            hashtag={lower}
            placeholder={`Post to ${display}…`}
          />
        </div>

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
              Be the first to post on {display}.
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
              <FeedPost key={event.id} event={event} />
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
}

export default HashtagPage;
