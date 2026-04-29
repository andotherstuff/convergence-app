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
  X,
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

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
            {/* Cover image — 4:3 landscape */}
            <div className="aos-card overflow-hidden mb-8 md:mb-10">
              <div className="aspect-[4/3] md:aspect-[16/10] bg-secondary">
                <img
                  src={project.cover}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
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

            {/* App screenshots */}
            {project.screenshots.length > 0 && (
              <div className="mb-12 md:mb-16">
                <div className="aos-kicker mb-4">App screenshots</div>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5 [column-fill:_balance]">
                  {project.screenshots.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setLightboxUrl(img)}
                      className="block w-full mb-4 md:mb-5 break-inside-avoid rounded-xl overflow-hidden border border-border bg-secondary hover:ring-2 hover:ring-foreground/20 transition-all focus-visible:ring-2 focus-visible:ring-foreground"
                      aria-label={`Open screenshot ${i + 1} full size`}
                    >
                      <img
                        src={img}
                        alt={`${project.title} screenshot ${i + 1}`}
                        loading="lazy"
                        className="w-full h-auto block"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

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

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setLightboxUrl(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot preview"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxUrl(null);
              }}
              className="absolute top-4 right-4 md:top-6 md:right-6 size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-colors"
              aria-label="Close preview"
            >
              <X className="size-5" />
            </button>
            <img
              src={lightboxUrl}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </section>
    </Layout>
  );
};

export default ProjectDetail;
