import { useSeoMeta } from "@unhead/react";
import { AlertCircle, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { cn } from "@/lib/utils";

const Settings = () => {
  useSeoMeta({
    title: "Settings · AOS Convergence",
    description:
      "Manage notifications and app preferences for AOS Convergence.",
  });

  const { toast } = useToast();
  const { request, isSupported, isGranted, isDenied } =
    useNotificationPermission();
  const { prefs, setPref } = useNotificationPreferences();

  const handleEnableChange = async (next: boolean) => {
    if (!next) {
      setPref("enabled", false);
      return;
    }

    // Enabling — make sure we have permission.
    if (!isSupported) {
      toast({
        title: "Notifications aren't supported",
        description:
          "Your browser doesn't support web notifications. Try Chrome, Edge, Firefox, or Safari on a desktop or Android device.",
        variant: "destructive",
      });
      return;
    }

    if (isDenied) {
      toast({
        title: "Notifications are blocked",
        description:
          "Your browser has blocked notifications for this site. Re-enable them from your browser's site settings, then come back.",
        variant: "destructive",
      });
      return;
    }

    if (!isGranted) {
      const result = await request();
      if (result !== "granted") {
        toast({
          title: "Notifications not enabled",
          description:
            result === "denied"
              ? "You declined the permission. Enable it from your browser's site settings to receive notifications."
              : "Permission wasn't granted. Try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setPref("enabled", true);
    toast({
      title: "Notifications enabled",
      description:
        "You'll get a notification when selected categories have new activity, while this tab is open.",
    });
  };

  const categoryDisabled = !prefs.enabled || !isGranted;

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-24 max-w-2xl">
        <header className="mb-8">
          <div className="aos-kicker mb-2">Your Preferences</div>
          <h1 className="aos-display text-3xl md:text-4xl">Settings</h1>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {isGranted && prefs.enabled ? (
                  <Bell className="size-5 text-foreground" />
                ) : (
                  <BellOff className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Get pinged when the community posts something new.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Permission state strip */}
            <PermissionStatus
              isSupported={isSupported}
              isGranted={isGranted}
              isDenied={isDenied}
            />

            {/* Honest UX note */}
            <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground font-medium">
                  Heads up:
                </strong>{" "}
                notifications fire while AOS Convergence is open in your
                browser. Closing the tab stops them. Install the app to
                your home screen and keep it running in the background
                for the best experience during the event.
              </p>
            </div>

            {/* Master toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="notif-enabled" className="text-base">
                  Enable notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Master switch for all notification types.
                </p>
              </div>
              <Switch
                id="notif-enabled"
                checked={prefs.enabled && isGranted}
                disabled={!isSupported || isDenied}
                onCheckedChange={handleEnableChange}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Category toggles */}
            <fieldset
              disabled={categoryDisabled}
              className={cn(
                "space-y-4 transition-opacity",
                categoryDisabled && "opacity-60"
              )}
            >
              <legend className="sr-only">Notification categories</legend>

              <CategoryToggle
                id="notif-announcements"
                label="Announcements"
                description="Official organizer updates."
                checked={prefs.announcements}
                onCheckedChange={(v) => setPref("announcements", v)}
                emoji="📣"
              />

              <CategoryToggle
                id="notif-posts"
                label="Feed posts"
                description={`All new posts tagged #AOSConvergence.`}
                checked={prefs.posts}
                onCheckedChange={(v) => setPref("posts", v)}
                emoji="💬"
              />

              <CategoryToggle
                id="notif-projects"
                label="Project submissions"
                description="When someone shares a new project."
                checked={prefs.projects}
                onCheckedChange={(v) => setPref("projects", v)}
                emoji="🚀"
              />
            </fieldset>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
};

interface PermissionStatusProps {
  isSupported: boolean;
  isGranted: boolean;
  isDenied: boolean;
}

function PermissionStatus({
  isSupported,
  isGranted,
  isDenied,
}: PermissionStatusProps) {
  if (!isSupported) {
    return (
      <StatusStrip tone="warning">
        <AlertCircle className="size-4 shrink-0" />
        <span>
          Your browser doesn't support notifications. Try Chrome, Edge,
          Firefox, or Safari.
        </span>
      </StatusStrip>
    );
  }
  if (isDenied) {
    return (
      <StatusStrip tone="warning">
        <AlertCircle className="size-4 shrink-0" />
        <span>
          Notifications are blocked for this site. Open your browser's
          site settings to re-enable them, then return to this page.
        </span>
      </StatusStrip>
    );
  }
  if (isGranted) {
    return (
      <StatusStrip tone="success">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>Permission granted. You'll receive notifications.</span>
      </StatusStrip>
    );
  }
  return null;
}

function StatusStrip({
  tone,
  children,
}: {
  tone: "success" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-sm rounded-md px-3 py-2 border",
        tone === "success" &&
          "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
        tone === "warning" &&
          "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
      )}
    >
      {children}
    </div>
  );
}

interface CategoryToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  emoji: string;
}

function CategoryToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  emoji,
}: CategoryToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="text-xl leading-none pt-0.5"
          aria-hidden="true"
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <Label htmlFor={id} className="text-base">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export default Settings;
