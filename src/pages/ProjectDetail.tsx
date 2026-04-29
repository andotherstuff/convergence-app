import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { useSeoMeta } from "@unhead/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  Code2,
  MessageSquareText,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ZapButton } from "@/components/ZapButton";
import { useProject } from "@/hooks/useProject";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { genUserName } from "@/lib/genUserName";
import { PROJECT_KIND } from "@/lib/constants";
import NotFound from "./NotFound";

function decodeNaddr(value: string): {
  pubkey: string;
  identifier: string;
  kind: number;
} | null {
  try {
    const decoded = nip19.decode(value);
    if (decoded.type !== "naddr") return null;
    return {
      pubkey: decoded.data.pubkey,
      identifier: decoded.data.identifier,
      kind: decoded.data.kind,
    };
  } catch {
    return null;
  }
}

const ProjectDetail = () => {
  const { naddr } = useParams<{ naddr: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const coords = naddr ? decodeNaddr(naddr) : null;

  // Guard: require the naddr to point to our project kind
  const validCoords =
    coords && coords.kind === PROJECT_KIND
      ? { pubkey: coords.pubkey, identifier: coords.identifier }
      : null;

  const { data: project, isLoading, isError } = useProject(validCoords);

  const author = useAuthor(project?.pubkey);
  const metadata = author.data?.metadata;
  const displayName = project
    ? metadata?.name || genUserName(project.pubkey)
    : "";
  const picture = metadata?.picture;
  const npub = project ? nip19.npubEncode(project.pubkey) : "";

  const [imageIdx, setImageIdx] = useState(0);

  useSeoMeta({
    title: project
      ? `${project.title} · AOS Convergence`
      : "Project · AOS Convergence",
    description: project?.summary,
  });

  // Invalid naddr → 404
  if (!coords || !validCoords) {
    return <NotFound />;
  }

  const isOwner = user && project && user.pubkey === project.pubkey;

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-16 md:pb-24">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>

        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        )}

        {(isError || (!isLoading && !project)) && (
          <div className="aos-card border-dashed p-10 text-center max-w-xl mx-auto">
            <p className="text-base font-semibold mb-2">Project not found</p>
            <p className="text-sm text-muted-foreground mb-6">
              It may have been deleted or isn't available on connected relays.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/projects")}
            >
              Back to projects
            </Button>
          </div>
        )}

        {project && (
          <article>
            {/* Image carousel */}
            <div className="relative aos-card overflow-hidden mb-8 md:mb-10">
              <div className="aspect-video bg-secondary">
                <img
                  src={project.images[imageIdx]}
                  alt={`${project.title} screenshot ${imageIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {project.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setImageIdx((i) =>
                        i === 0 ? project.images.length - 1 : i - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background transition-colors"
                    aria-label="Previous screenshot"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImageIdx((i) =>
                        i === project.images.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background transition-colors"
                    aria-label="Next screenshot"
                  >
                    <ChevronRight className="size-4" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {project.images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImageIdx(i)}
                        className={`size-2 rounded-full transition-colors ${
                          i === imageIdx
                            ? "bg-foreground"
                            : "bg-foreground/30 hover:bg-foreground/60"
                        }`}
                        aria-label={`Screenshot ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Header */}
            <header className="mb-6 md:mb-8">
              <h1 className="aos-display mb-4">{project.title}</h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                <Link
                  to={`/${npub}`}
                  className="flex items-center gap-2 hover:text-foreground text-muted-foreground"
                >
                  <Avatar className="size-7 border border-border">
                    <AvatarImage src={picture} alt={displayName} />
                    <AvatarFallback className="text-[10px] bg-secondary">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {displayName}
                  </span>
                </Link>

                <span className="text-muted-foreground">
                  Posted{" "}
                  {formatDistanceToNow(new Date(project.createdAt * 1000), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </header>

            {/* Action row */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8 md:mb-10">
              <Button asChild className="rounded-full">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink className="size-4 mr-1.5" />
                  Visit site
                </a>
              </Button>

              <Button asChild variant="outline" className="rounded-full">
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Code2 className="size-4 mr-1.5" />
                  Repository
                </a>
              </Button>

              {/* ZapButton returns null if unzappable */}
              <div className="rounded-full overflow-hidden">
                <ZapButton target={project.event} />
              </div>

              {isOwner && (
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full sm:ml-auto"
                >
                  <Link to={`/projects/submit?edit=${project.naddr}`}>
                    <Pencil className="size-4 mr-1.5" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>

            <Separator className="mb-8" />

            {/* Description */}
            <div className="mb-12 md:mb-16">
              <div className="aos-kicker mb-3">About</div>
              <div
                className="text-[1rem] leading-relaxed text-foreground whitespace-pre-wrap"
                // Description comes from event.content — already validated
                // as a string and rendered as text (no HTML). Safe.
              >
                {project.description}
              </div>
            </div>

            {/* Comments */}
            <div>
              <header className="mb-6">
                <div className="aos-kicker mb-2">Discussion</div>
                <h2 className="aos-title flex items-center gap-2">
                  <MessageSquareText className="size-5" />
                  Comments
                </h2>
              </header>

              <div className="aos-card p-5 md:p-6">
                <CommentsSection
                  root={project.event}
                  emptyStateMessage="No comments yet"
                  emptyStateSubtitle="Share feedback, ask questions, or show some love."
                />
              </div>
            </div>
          </article>
        )}
      </section>
    </Layout>
  );
};

export default ProjectDetail;
