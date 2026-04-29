import { Link } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { Plus, Rocket } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  ProjectCard,
  ProjectCardSkeleton,
} from "@/components/projects/ProjectCard";
import { useProjects } from "@/hooks/useProjects";

const Projects = () => {
  useSeoMeta({
    title: "Projects · AOS Convergence",
    description:
      "Projects submitted by AOS Convergence attendees. Open source, open protocols, open systems.",
  });

  const { data: projects, isLoading, isError } = useProjects();

  return (
    <Layout>
      <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="aos-kicker mb-2">Showcase</div>
            <h1 className="aos-display mb-3">Projects</h1>
            <p className="aos-body max-w-xl">
              Builders sharing what they're working on. Submit yours to join the
              showcase — anyone with a Nostr identity can post.
            </p>
          </div>

          <Button asChild size="lg" className="rounded-full self-start shrink-0">
            <Link to="/projects/submit">
              <Plus className="size-4 mr-1.5" />
              Submit a project
            </Link>
          </Button>
        </header>

        {isLoading && (
          <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn't load projects. Check your relay connection and try again.
            </p>
          </div>
        )}

        {!isLoading && !isError && projects && projects.length === 0 && (
          <div className="aos-card border-dashed p-10 md:p-14 text-center max-w-xl mx-auto">
            <div className="size-12 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Rocket className="size-5 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">
              No projects yet
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Be the first to share what you're building at the convergence.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/projects/submit">
                <Plus className="size-4 mr-1.5" />
                Submit the first project
              </Link>
            </Button>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Projects;
