import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { Code2, ExternalLink } from "lucide-react";
import type { Project } from "@/lib/project";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const author = useAuthor(project.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(project.pubkey);
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(project.pubkey);

  return (
    <article className="aos-card aos-card-hover overflow-hidden flex flex-col group">
      <Link
        to={`/projects/${project.naddr}`}
        className="aspect-video bg-secondary overflow-hidden block"
        aria-label={`View ${project.title}`}
      >
        <img
          src={project.images[0]}
          alt={project.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex-1 flex flex-col p-5">
        <Link
          to={`/projects/${project.naddr}`}
          className="block"
        >
          <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1.5 line-clamp-1">
            {project.title}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4 flex-1">
          {project.summary}
        </p>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-auto">
          <Link
            to={`/${npub}`}
            className="flex items-center gap-2 min-w-0 group/author"
          >
            <Avatar className="size-6 border border-border shrink-0">
              <AvatarImage src={picture} alt={displayName} />
              <AvatarFallback className="text-[10px] bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground group-hover/author:text-foreground truncate">
              {displayName}
            </span>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Repository"
              title="Repository"
            >
              <Code2 className="size-4" />
            </a>
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Live site"
              title="Live site"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="aos-card overflow-hidden">
      <div className="aspect-video bg-secondary animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-secondary rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-secondary rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-secondary rounded animate-pulse" />
        </div>
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="h-6 w-24 bg-secondary rounded animate-pulse" />
          <div className="h-6 w-16 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
