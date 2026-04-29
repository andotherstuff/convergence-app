import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { useSeoMeta } from "@unhead/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginArea } from "@/components/auth/LoginArea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useProject } from "@/hooks/useProject";
import { useToast } from "@/hooks/useToast";
import {
  AOS_HASHTAG,
  AOS_HASHTAG_DISPLAY,
  PROJECT_KIND,
} from "@/lib/constants";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function generateId(title: string): string {
  const slug = slugify(title) || "project";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${rand}`;
}

const ProjectSubmit = () => {
  useSeoMeta({
    title: "Submit a Project · AOS Convergence",
  });

  const [searchParams] = useSearchParams();
  const editingNaddr = searchParams.get("edit");

  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // If editing, load the existing project
  const editCoords = (() => {
    if (!editingNaddr || !user) return null;
    try {
      const decoded = nip19.decode(editingNaddr);
      if (decoded.type !== "naddr") return null;
      if (decoded.data.pubkey !== user.pubkey) return null;
      if (decoded.data.kind !== PROJECT_KIND) return null;
      return {
        pubkey: decoded.data.pubkey,
        identifier: decoded.data.identifier,
      };
    } catch {
      return null;
    }
  })();

  const { data: existing } = useProject(editCoords);

  // Form fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [existingD, setExistingD] = useState<string | null>(null);

  // Prefill when editing
  useEffect(() => {
    if (existing && !existingD) {
      setTitle(existing.title);
      setSummary(existing.summary);
      setDescription(existing.description);
      setUrl(existing.url);
      setRepo(existing.repo);
      setImages(existing.images);
      setExistingD(existing.d);
    }
  }, [existing, existingD]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Not an image",
            description: `${file.name} was skipped.`,
            variant: "destructive",
          });
          continue;
        }
        const tags = await uploadFile(file);
        const imgUrl = tags[0][1];
        setImages((prev) => [...prev, imgUrl]);
      }
      toast({ title: "Screenshot uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (title.trim().length > 120) next.title = "Title must be 120 chars or less";
    if (!description.trim()) next.description = "Description is required";
    if (!url.trim()) next.url = "Project URL is required";
    else if (!/^https?:\/\//i.test(url.trim()))
      next.url = "Must start with http:// or https://";
    if (!repo.trim()) next.repo = "Repository URL is required";
    else if (!/^https?:\/\//i.test(repo.trim()))
      next.repo = "Must start with http:// or https://";
    if (images.length === 0) next.images = "At least one screenshot is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

    const d = existingD ?? generateId(title);

    const tags: string[][] = [
      ["d", d],
      ["title", title.trim()],
      ["url", url.trim()],
      ["repo", repo.trim()],
      ["t", AOS_HASHTAG],
      ["client", "aos-convergence"],
      [
        "alt",
        `AOS Convergence project showcase: ${title.trim()}`,
      ],
    ];

    if (summary.trim()) tags.push(["summary", summary.trim()]);
    for (const img of images) tags.push(["image", img]);

    try {
      const event = await publish({
        kind: PROJECT_KIND,
        content: description.trim(),
        tags,
      });

      const naddr = nip19.naddrEncode({
        kind: PROJECT_KIND,
        pubkey: event.pubkey,
        identifier: d,
      });

      toast({
        title: existingD ? "Project updated" : "Project submitted!",
        description: "Your project is now live in the showcase.",
      });

      // Invalidate queries and navigate
      queryClient.invalidateQueries({ queryKey: ["projects", AOS_HASHTAG] });
      queryClient.invalidateQueries({
        queryKey: ["project", event.pubkey, d],
      });

      navigate(`/projects/${naddr}`);
    } catch (err) {
      toast({
        title: "Failed to submit",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const isEditing = !!existingD;

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-16 md:pb-24 max-w-3xl">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>

        <header className="mb-8">
          <div className="aos-kicker mb-2">
            {isEditing ? "Edit" : "Submit"}
          </div>
          <h1 className="aos-display">
            {isEditing ? "Edit project" : "Share your project"}
          </h1>
          <p className="aos-body mt-3">
            Submitted projects show up in the showcase alongside everyone else's
            work. Published as a Nostr event tagged{" "}
            <span className="text-foreground font-medium">
              {AOS_HASHTAG_DISPLAY}
            </span>
            .
          </p>
        </header>

        {!user && (
          <div className="aos-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Sign in to submit
              </p>
              <p className="text-sm text-muted-foreground">
                You need a Nostr account to publish a project.
              </p>
            </div>
            <LoginArea className="self-start md:self-auto" />
          </div>
        )}

        {user && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="aos-card p-5 md:p-8 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Highlighter"
                  maxLength={120}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label htmlFor="summary">Tagline</Label>
                <Input
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="One-liner shown on the showcase grid"
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Shown on the project card.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does it do? Who is it for? Why does it matter?"
                  rows={6}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">
                  Project URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  aria-invalid={!!errors.url}
                />
                {errors.url && (
                  <p className="text-xs text-destructive">{errors.url}</p>
                )}
              </div>

              {/* Repo */}
              <div className="space-y-2">
                <Label htmlFor="repo">
                  Repository URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="repo"
                  type="url"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="https://github.com/your/repo"
                  aria-invalid={!!errors.repo}
                />
                {errors.repo && (
                  <p className="text-xs text-destructive">{errors.repo}</p>
                )}
              </div>

              {/* Screenshots */}
              <div className="space-y-3">
                <Label>
                  Screenshots <span className="text-destructive">*</span>
                </Label>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, i) => (
                      <div
                        key={img}
                        className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-secondary"
                      >
                        <img
                          src={img}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/90 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Remove screenshot ${i + 1}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="sr-only"
                    disabled={isUploading || isPublishing}
                  />
                  <span className="aos-card border-dashed cursor-pointer flex flex-col items-center justify-center py-8 px-4 text-center hover:border-foreground/40 transition-colors">
                    {isUploading ? (
                      <>
                        <Loader2 className="size-5 mb-2 text-muted-foreground animate-spin" />
                        <span className="text-sm font-medium text-foreground">
                          Uploading…
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-5 mb-2 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground mb-0.5">
                          {images.length === 0
                            ? "Upload screenshots"
                            : "Add more screenshots"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, or WebP. The first one is the cover image.
                        </span>
                      </>
                    )}
                  </span>
                </label>

                {errors.images && (
                  <p className="text-xs text-destructive">{errors.images}</p>
                )}
              </div>
            </div>

            <Alert>
              <ImageIcon className="size-4" />
              <AlertDescription className="text-xs">
                Your project is published as an addressable Nostr event (kind{" "}
                {PROJECT_KIND}). You can edit or update it at any time.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/projects")}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPublishing || isUploading}
                className="rounded-full px-6"
                size="lg"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Publishing…
                  </>
                ) : isEditing ? (
                  "Save changes"
                ) : (
                  "Submit project"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>
    </Layout>
  );
};

export default ProjectSubmit;
