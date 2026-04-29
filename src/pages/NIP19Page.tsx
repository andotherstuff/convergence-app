import { useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ExternalLink,
  ListFilter,
  MessageCircle,
  MessageSquareText,
  QrCode,
  Rocket,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowList } from "@/hooks/useFollowList";
import { useFollowers } from "@/hooks/useFollowers";
import { genUserName } from "@/lib/genUserName";
import { PROJECT_KIND, isOrganizer } from "@/lib/constants";
import {
  useAuthorAosActivity,
  filterActivity,
  type ActivityKind,
} from "@/hooks/useAuthorAosActivity";
import { FeedItem } from "@/components/feed/FeedItem";
import { FeedPostSkeleton } from "@/components/feed/FeedPost";
import { FollowButton } from "@/components/profile/FollowButton";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { FollowListSheet } from "@/components/profile/FollowListSheet";
import { cn } from "@/lib/utils";
import NotFound from "./NotFound";

function ProfileView({ pubkey }: { pubkey: string }) {
  const { user } = useCurrentUser();
  const isOwn = user?.pubkey === pubkey;

  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const picture = metadata?.picture;
  const about = metadata?.about;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;

  // Follow state
  const { data: followList } = useFollowList(pubkey);
  const { data: followers, isLoading: followersLoading } = useFollowers(pubkey);

  const followingCount = followList?.following.length ?? 0;
  const followersCount = followers?.pubkeys.length ?? 0;
  const followersAtCap = followers?.atCap ?? false;

  // AOS activity
  const { data: activity = [], isLoading } = useAuthorAosActivity(pubkey);
  const [tab, setTab] = useState<ActivityKind>("all");

  const counts = useMemo(() => {
    return {
      all: activity.length,
      posts: activity.filter((e) => e.kind === 1).length,
      projects: activity.filter((e) => e.kind === PROJECT_KIND).length,
      comments: activity.filter((e) => e.kind === 1111).length,
    };
  }, [activity]);

  const filtered = useMemo(() => filterActivity(activity, tab), [activity, tab]);
  const organizer = isOrganizer(pubkey);

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-16 md:pb-24">
        {/* Banner */}
        {metadata?.banner && (
          <div className="aspect-[3/1] bg-secondary rounded-2xl overflow-hidden mb-6 border border-border">
            <img
              src={metadata.banner}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Profile header */}
        <div className="flex items-start gap-4 mb-5">
          <Avatar className="size-20 md:size-24 border border-border shrink-0">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xl bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="aos-title text-2xl md:text-3xl break-words">
                    {displayName}
                  </h1>
                  {organizer && (
                    <span className="aos-eyebrow text-[0.62rem]">
                      <span className="aos-eyebrow-dot" />
                      Organizer
                    </span>
                  )}
                </div>
                {nip05 && (
                  <p className="text-sm text-muted-foreground truncate">
                    {nip05.replace(/^_@/, "")}
                  </p>
                )}
              </div>

              {/* Action cluster */}
              <div className="flex items-center gap-2 shrink-0">
                {isOwn ? (
                  <ShareProfileDialog pubkey={pubkey} displayName={displayName}>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="rounded-full"
                    >
                      <QrCode className="size-4 mr-1.5" />
                      Share
                    </Button>
                  </ShareProfileDialog>
                ) : (
                  <FollowButton pubkey={pubkey} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {about && (
          <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap mb-4 text-foreground max-w-2xl">
            {about}
          </p>
        )}

        {/* Website */}
        {website && (
          <div className="flex flex-wrap gap-3 mb-5">
            <a
              href={website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm aos-link inline-flex items-center gap-1.5"
            >
              {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}

        {/* Follow stats */}
        <div className="flex items-center gap-5 text-sm mb-8 pb-6 border-b border-border">
          <FollowListSheet
            mode="following"
            displayName={displayName}
            pubkeys={followList?.following ?? []}
          >
            <button
              type="button"
              className="hover:text-foreground transition-colors focus-visible:outline-none"
            >
              <span className="font-semibold text-foreground tabular-nums">
                {followingCount.toLocaleString()}
              </span>{" "}
              <span className="text-muted-foreground">Following</span>
            </button>
          </FollowListSheet>

          <FollowListSheet
            mode="followers"
            displayName={displayName}
            pubkeys={followers?.pubkeys ?? []}
            atCap={followersAtCap}
            isLoading={followersLoading}
          >
            <button
              type="button"
              className="hover:text-foreground transition-colors focus-visible:outline-none"
            >
              <span className="font-semibold text-foreground tabular-nums">
                {followersLoading ? "…" : followersCount.toLocaleString()}
                {followersAtCap && "+"}
              </span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </button>
          </FollowListSheet>
        </div>

        {/* AOS activity section */}
        <div>
          <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="aos-kicker mb-1.5">AOS Convergence activity</div>
              <h2 className="aos-title text-lg md:text-xl">
                What {displayName} has shared
              </h2>
            </div>

            {/* Tabs — icons-only on narrow screens, labels from sm: up */}
            <div
              role="tablist"
              className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-background shrink-0"
            >
              <TabButton
                active={tab === "all"}
                onClick={() => setTab("all")}
                label="All"
                count={counts.all}
                icon={<ListFilter className="size-3.5" />}
              />
              <TabButton
                active={tab === "posts"}
                onClick={() => setTab("posts")}
                label="Posts"
                count={counts.posts}
                icon={<MessageSquareText className="size-3.5" />}
              />
              <TabButton
                active={tab === "projects"}
                onClick={() => setTab("projects")}
                label="Projects"
                count={counts.projects}
                icon={<Rocket className="size-3.5" />}
              />
              <TabButton
                active={tab === "comments"}
                onClick={() => setTab("comments")}
                label="Comments"
                count={counts.comments}
                icon={<MessageCircle className="size-3.5" />}
              />
            </div>
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="aos-card border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing to show here yet.
              </p>
            </div>
          )}

          {(isLoading || filtered.length > 0) && (
            <div className="aos-feed-list">
              {isLoading && (
                <>
                  <FeedPostSkeleton />
                  <FeedPostSkeleton />
                </>
              )}
              {filtered.map((event) => (
                <FeedItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: React.ReactNode;
}

function TabButton({ active, onClick, label, count, icon }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={`${label} (${count})`}
      title={`${label} (${count})`}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          active ? "opacity-80" : "opacity-60"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case "npub":
      return <ProfileView pubkey={decoded.data} />;

    case "nprofile":
      return <ProfileView pubkey={decoded.data.pubkey} />;

    case "naddr": {
      if (decoded.data.kind === PROJECT_KIND) {
        return <Navigate to={`/projects/${identifier}`} replace />;
      }
      return (
        <Layout>
          <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24 max-w-xl">
            <div className="aos-kicker mb-2">Addressable event</div>
            <h1 className="aos-title mb-4">Event preview</h1>
            <p className="aos-body mb-6">
              This addressable event (kind {decoded.data.kind}) isn't handled
              directly by this app.
            </p>
            <div className="aos-card p-4 text-xs font-mono break-all text-muted-foreground">
              {identifier}
            </div>
          </section>
        </Layout>
      );
    }

    case "note":
    case "nevent":
      return (
        <Layout>
          <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24 max-w-xl">
            <div className="aos-kicker mb-2">Event</div>
            <h1 className="aos-title mb-4">Event preview</h1>
            <p className="aos-body mb-6">
              Single-event view isn't implemented yet. Browse the main feed
              instead.
            </p>
            <div className="aos-card p-4 text-xs font-mono break-all text-muted-foreground mb-6">
              {identifier}
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back to feed</Link>
            </Button>
          </section>
        </Layout>
      );

    default:
      return <NotFound />;
  }
}
