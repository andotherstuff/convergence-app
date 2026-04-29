import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { useInView } from "react-intersection-observer";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Compose } from "@/components/feed/Compose";
import { FeedPost, FeedPostSkeleton } from "@/components/feed/FeedPost";
import { useHashtagFeed } from "@/hooks/useHashtagFeed";
import { AOS_HASHTAG, AOS_HASHTAG_DISPLAY } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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
  } = useHashtagFeed(AOS_HASHTAG);

  const { ref, inView } = useInView({ rootMargin: "400px 0px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = useMemo(() => {
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
    <Layout hero>
      {/* HERO */}
      <section className="aos-shell pt-10 pb-8 md:pt-20 md:pb-16">
        <div className="max-w-3xl">
          <span className="aos-eyebrow mb-5">
            <span className="aos-eyebrow-dot" />
            Oslo · May 29 – 31, 2026
          </span>

          <h1 className="aos-display mb-5">AOS Convergence</h1>

          <p className="aos-body text-base md:text-lg max-w-2xl mb-8">
            A curated three-day gathering for builders, researchers, funders,
            and community leaders actively working to expand human agency
            through open systems.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-3 items-center text-sm">
            <Link to="/schedule" className="aos-link inline-flex items-center gap-1.5">
              View schedule
              <ArrowUpRight className="size-4" />
            </Link>
            <Link to="/projects" className="aos-link inline-flex items-center gap-1.5">
              Browse projects
              <ArrowUpRight className="size-4" />
            </Link>
            <a
              href="https://convergence.andotherstuff.org/"
              target="_blank"
              rel="noreferrer noopener"
              className="aos-link inline-flex items-center gap-1.5 text-muted-foreground"
            >
              Official site
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FEED */}
      <section className="aos-shell pb-24 border-t border-border pt-10 md:pt-14">
        <header className="mb-6 md:mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="aos-kicker mb-2">The Conversation</div>
            <h2 className="aos-title flex items-center gap-2">
              <MessageSquareText className="size-5 shrink-0" />
              {AOS_HASHTAG_DISPLAY}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Every Nostr note tagged{" "}
            <span className="font-mono text-foreground">
              {AOS_HASHTAG_DISPLAY}
            </span>{" "}
            appears here.
          </p>
        </header>

        <div className="space-y-4 md:space-y-5">
          <Compose />

          {isLoading && (
            <>
              <FeedPostSkeleton />
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </>
          )}

          {isError && (
            <div className="aos-card border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Couldn't load the feed. Check your relay connection and try
                again.
              </p>
            </div>
          )}

          {!isLoading && !isError && posts.length === 0 && (
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

          {posts.map((post) => (
            <FeedPost key={post.id} event={post} />
          ))}

          {hasNextPage && (
            <div ref={ref} className="py-4">
              {isFetchingNextPage && <FeedPostSkeleton />}
            </div>
          )}

          {!hasNextPage && posts.length > 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              You've reached the beginning.
            </div>
          )}
        </div>

        {!hasNextPage && posts.length >= 10 && (
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
