import { useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ExternalLink,
  MessageCircle,
  MessageSquareText,
  Rocket,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { PROJECT_KIND, isOrganizer } from "@/lib/constants";
import {
  useAuthorAosActivity,
  filterActivity,
  type ActivityKind,
} from "@/hooks/useAuthorAosActivity";
import { FeedItem } from "@/components/feed/FeedItem";
import { FeedPostSkeleton } from "@/components/feed/FeedPost";
import { cn } from "@/lib/utils";
import NotFound from "./NotFound";

function ProfileView({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const picture = metadata?.picture;
  const about = metadata?.about;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;

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
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="size-20 md:size-24 border border-border shrink-0">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xl bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="aos-title text-2xl md:text-3xl">{displayName}</h1>
              {organizer && (
                <span className="aos-eyebrow text-[0.62rem]">
                  <span className="aos-eyebrow-dot" />
                  Organizer
                </span>
              )}
            </div>
            {nip05 && (
              <p className="text-sm text-muted-foreground">
                {nip05.replace(/^_@/, "")}
              </p>
            )}
          </div>
        </div>

        {about && (
          <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap mb-5 text-foreground max-w-2xl">
            {about}
          </p>
        )}

        {website && (
          <div className="flex flex-wrap gap-3 mb-8">
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

        {/* AOS activity section */}
        <div className="pt-6 border-t border-border">
          <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="aos-kicker mb-1.5">AOS Convergence activity</div>
              <h2 className="aos-title text-lg md:text-xl">
                What {displayName} has shared
              </h2>
            </div>

            {/* Tabs */}
            <div
              role="tablist"
              className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-background"
            >
              <TabButton
                active={tab === "all"}
                onClick={() => setTab("all")}
                label="All"
                count={counts.all}
              />
              <TabButton
                active={tab === "posts"}
                onClick={() => setTab("posts")}
                label="Posts"
                count={counts.posts}
                icon={<MessageSquareText className="size-3" />}
              />
              <TabButton
                active={tab === "projects"}
                onClick={() => setTab("projects")}
                label="Projects"
                count={counts.projects}
                icon={<Rocket className="size-3" />}
              />
              <TabButton
                active={tab === "comments"}
                onClick={() => setTab("comments")}
                label="Comments"
                count={counts.comments}
                icon={<MessageCircle className="size-3" />}
              />
            </div>
          </div>

          {isLoading && (
            <div className="space-y-4">
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="aos-card border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing to show here yet.
              </p>
            </div>
          )}

          <div className="space-y-4 md:space-y-5">
            {filtered.map((event) => (
              <FeedItem key={event.id} event={event} />
            ))}
          </div>
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
  icon?: React.ReactNode;
}

function TabButton({ active, onClick, label, count, icon }: TabButtonProps) {
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
      // If it points to one of our projects, route there
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
