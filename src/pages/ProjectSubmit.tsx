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
  Monitor,
  ArrowUp,
  ArrowDown,
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
import { parseProject, type Project } from "@/lib/project";
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
  const [zapstore, setZapstore] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [existingD, setExistingD] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<
    "cover" | "screenshots" | null
  >(null);

  // Prefill when editing
  useEffect(() => {
    if (existing && !existingD) {
      setTitle(existing.title);
      setSummary(existing.summary);
      setDescription(existing.description);
      setUrl(existing.url);
      setRepo(existing.repo);
      setZapstore(existing.zapstore ?? "");
      setCover(existing.cover);
      setScreenshots(existing.screenshots);
      setExistingD(existing.d);
    }
  }, [existing, existingD]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please select an image file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setUploadingField("cover");
    try {
      const tags = await uploadFile(file);
      const imgUrl = tags[0][1];
      setCover(imgUrl);
      toast({ title: "Cover image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingField("screenshots");
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
        setScreenshots((prev) => [...prev, imgUrl]);
      }
      toast({ title: "Screenshot uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const removeScreenshot = (idx: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveScreenshot = (idx: number, direction: -1 | 1) => {
    setScreenshots((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
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
    if (!cover) next.cover = "A cover image is required";
    // Zapstore is optional — but if provided it must be a valid
    // reverse-domain package name (no slashes, no URL).
    if (
      zapstore.trim() &&
      !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(zapstore.trim())
    ) {
      next.zapstore =
        "Must be a reverse-domain package name like com.example.app";
    }
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
      ["cover", cover!],
      ["t", AOS_HASHTAG],
      // `client` tag is added automatically by `useNostrPublish` so the
      // canonical value (`aos-convergence.app`) stays consistent across
      // every event this app publishes.
      [
        "alt",
        `AOS Convergence project showcase: ${title.trim()}`,
      ],
    ];

    if (summary.trim()) tags.push(["summary", summary.trim()]);
    if (zapstore.trim()) tags.push(["zapstore", zapstore.trim()]);
    for (const img of screenshots) tags.push(["image", img]);

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

      // Seed the query cache with the freshly-signed event so the detail
      // page renders immediately — relays may take a moment to propagate.
      const parsed = parseProject(event);
      if (parsed) {
        queryClient.setQueryData<Project>(
          ["project", event.pubkey, d],
          parsed
        );
        // Also merge into the projects list cache so /projects shows it.
        queryClient.setQueryData<Project[] | undefined>(
          ["projects", AOS_HASHTAG],
          (prev) => {
            if (!prev) return [parsed];
            const filtered = prev.filter(
              (p) => !(p.pubkey === parsed.pubkey && p.d === parsed.d)
            );
            return [parsed, ...filtered];
          }
        );
      }

      toast({
        title: existingD ? "Project updated" : "Project submitted!",
        description: "Your project is now live in the showcase.",
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

              {/* Zapstore app ID (optional) */}
              <div className="space-y-2">
                <Label htmlFor="zapstore">Zapstore app ID</Label>
                <Input
                  id="zapstore"
                  value={zapstore}
                  onChange={(e) => setZapstore(e.target.value)}
                  placeholder="com.example.app"
                  aria-invalid={!!errors.zapstore}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. If your project is on Zapstore, paste the Android
                  package name (reverse-domain like{" "}
                  <span className="font-mono">com.example.app</span>). A "Get
                  on Zapstore" button will appear on your project page.
                </p>
                {errors.zapstore && (
                  <p className="text-xs text-destructive">
                    {errors.zapstore}
                  </p>
                )}
              </div>

              {/* Cover image */}
              <div className="space-y-3">
                <Label>
                  Cover image <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  A landscape (4:3) hero image shown on the project grid and at
                  the top of the detail page.
                </p>

                {cover ? (
                  <div className="relative group">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-border bg-secondary">
                      <img
                        src={cover}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label className="p-1.5 rounded-full bg-background/95 border border-border hover:bg-background transition-colors cursor-pointer shadow-sm">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="sr-only"
                          disabled={
                            uploadingField !== null || isPublishing
                          }
                        />
                        <Upload className="size-3.5" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCover(null)}
                        className="p-1.5 rounded-full bg-background/95 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                        aria-label="Remove cover image"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block max-w-md">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="sr-only"
                      disabled={uploadingField !== null || isPublishing}
                    />
                    <span className="aos-card border-dashed cursor-pointer flex flex-col items-center justify-center aspect-[4/3] px-4 text-center hover:border-foreground/40 transition-colors">
                      {uploadingField === "cover" ? (
                        <>
                          <Loader2 className="size-5 mb-2 text-muted-foreground animate-spin" />
                          <span className="text-sm font-medium text-foreground">
                            Uploading…
                          </span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-6 mb-2 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground mb-0.5">
                            Upload cover image
                          </span>
                          <span className="text-xs text-muted-foreground">
                            4:3 landscape recommended
                          </span>
                        </>
                      )}
                    </span>
                  </label>
                )}

                {errors.cover && (
                  <p className="text-xs text-destructive">{errors.cover}</p>
                )}
              </div>

              {/* App screenshots */}
              <div className="space-y-3">
                <Label>App screenshots</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Optional. Mobile or desktop screenshots shown in a gallery
                  below your project description. Any size works. Use the
                  arrows to reorder.
                </p>

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.map((img, i) => {
                      const isFirst = i === 0;
                      const isLast = i === screenshots.length - 1;
                      return (
                        <div
                          key={img}
                          className="relative group rounded-lg overflow-hidden border border-border bg-secondary"
                        >
                          <img
                            src={img}
                            alt={`Screenshot ${i + 1}`}
                            className="w-full h-auto block"
                          />

                          {/* Position badge */}
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-background/95 border border-border text-[10px] font-medium tabular-nums shadow-sm">
                            {i + 1} / {screenshots.length}
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeScreenshot(i)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/95 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                            aria-label={`Remove screenshot ${i + 1}`}
                          >
                            <X className="size-3.5" />
                          </button>

                          {/* Reorder controls */}
                          {screenshots.length > 1 && (
                            <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveScreenshot(i, -1)}
                                disabled={isFirst}
                                className="p-1 rounded-md bg-background/95 border border-border hover:bg-foreground hover:text-background transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background/95 disabled:hover:text-foreground"
                                aria-label={`Move screenshot ${i + 1} earlier`}
                                title="Move earlier"
                              >
                                <ArrowUp className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveScreenshot(i, 1)}
                                disabled={isLast}
                                className="p-1 rounded-md bg-background/95 border border-border hover:bg-foreground hover:text-background transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background/95 disabled:hover:text-foreground"
                                aria-label={`Move screenshot ${i + 1} later`}
                                title="Move later"
                              >
                                <ArrowDown className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotUpload}
                    className="sr-only"
                    disabled={uploadingField !== null || isPublishing}
                  />
                  <span className="aos-card border-dashed cursor-pointer flex flex-col items-center justify-center py-8 px-4 text-center hover:border-foreground/40 transition-colors">
                    {uploadingField === "screenshots" ? (
                      <>
                        <Loader2 className="size-5 mb-2 text-muted-foreground animate-spin" />
                        <span className="text-sm font-medium text-foreground">
                          Uploading…
                        </span>
                      </>
                    ) : (
                      <>
                        <Monitor className="size-5 mb-2 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground mb-0.5">
                          {screenshots.length === 0
                            ? "Upload screenshots"
                            : "Add more screenshots"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Mobile, desktop, any aspect ratio
                        </span>
                      </>
                    )}
                  </span>
                </label>
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
