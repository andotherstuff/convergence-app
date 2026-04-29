import { useEffect, useState } from "react";
import { Download, Plus, Share as ShareIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Chrome's `beforeinstallprompt` event. Not yet in lib.dom as of this
 * writing, so we type it locally.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const LS_KEY = "aos:install-prompt-state";
/** How long to wait before re-showing after a soft dismiss (14 days). */
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** Delay (ms) after mount before the prompt is eligible to appear. */
const INITIAL_DELAY_MS = 4000;

type PromptState = {
  /** ISO timestamp of last dismissal, or null if never dismissed. */
  dismissedAt?: string;
  /** True once the user has completed the install flow. */
  installed?: boolean;
};

function readState(): PromptState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PromptState;
  } catch {
    return {};
  }
}

function writeState(state: PromptState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Covers iPhone, iPad (pre-iPadOS 13), and iPod. iPadOS 13+ reports
  // as desktop Safari but still has touch + the Mac `standalone`
  // property is undefined there, which is fine — we fall through to
  // the desktop branch and just don't show a manual guide.
  return /iPhone|iPad|iPod/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari exposes this legacy flag when launched from the home
  // screen.
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  return navAny.standalone === true;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // Listen for the install event from Chromium-based browsers.
  useEffect(() => {
    if (isStandalone()) return;
    const state = readState();
    if (state.installed) return;
    if (
      state.dismissedAt &&
      Date.now() - new Date(state.dismissedAt).getTime() < COOLDOWN_MS
    ) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Schedule the dialog to open after the initial delay so it
      // doesn't compete with the first-paint experience.
      window.setTimeout(() => setOpen(true), INITIAL_DELAY_MS);
    };

    const onInstalled = () => {
      writeState({ installed: true });
      setDeferredPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt. Fall back to a
    // manual "Add to Home Screen" guide after the initial delay.
    if (isIos()) {
      const id = window.setTimeout(() => {
        setIosHint(true);
        setOpen(true);
      }, INITIAL_DELAY_MS);
      return () => {
        window.clearTimeout(id);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = (remember = true) => {
    setOpen(false);
    if (remember) {
      writeState({ dismissedAt: new Date().toISOString() });
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        writeState({ installed: true });
      } else {
        writeState({ dismissedAt: new Date().toISOString() });
      }
    } catch {
      writeState({ dismissedAt: new Date().toISOString() });
    } finally {
      setDeferredPrompt(null);
      setOpen(false);
    }
  };

  const canTriggerNative = !!deferredPrompt;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss(true);
        else setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        {/* Branded hero */}
        <div
          className={cn(
            "relative flex flex-col items-center gap-3 px-6 pt-8 pb-6",
            "bg-gradient-to-b from-foreground/[0.04] to-transparent"
          )}
        >
          <img
            src="/icon-512.png"
            alt=""
            className="size-16 rounded-2xl shadow-md ring-1 ring-border"
            width={64}
            height={64}
          />
          <div className="aos-kicker">AOS Convergence</div>
        </div>

        <div className="px-6 pb-5 -mt-1">
          <DialogHeader className="text-center sm:text-center mb-3">
            <DialogTitle className="text-xl">
              Install the app
            </DialogTitle>
            <DialogDescription>
              {iosHint
                ? "Add AOS Convergence to your Home Screen for faster access during the event."
                : "Get the fastest AOS Convergence experience — opens instantly, no browser chrome, right from your home screen."}
            </DialogDescription>
          </DialogHeader>

          {iosHint && (
            <ol className="space-y-3 text-sm text-foreground/90 rounded-lg border border-border bg-secondary/40 p-4 mb-4">
              <li className="flex items-start gap-3">
                <span className="inline-flex shrink-0 size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium">
                  1
                </span>
                <span className="leading-snug">
                  Tap the{" "}
                  <ShareIcon className="inline size-4 -mt-0.5" /> Share
                  button in Safari's toolbar.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex shrink-0 size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium">
                  2
                </span>
                <span className="leading-snug">
                  Scroll down and tap{" "}
                  <span className="font-medium">
                    <Plus className="inline size-4 -mt-0.5" /> Add to Home
                    Screen
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex shrink-0 size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium">
                  3
                </span>
                <span className="leading-snug">
                  Tap <span className="font-medium">Add</span> in the
                  top-right corner. You're in.
                </span>
              </li>
            </ol>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-col-reverse gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => dismiss(true)}
              className="w-full"
              type="button"
            >
              <X className="size-4 mr-1.5" />
              Not now
            </Button>
            {canTriggerNative && (
              <Button
                onClick={install}
                className="w-full rounded-full"
                type="button"
              >
                <Download className="size-4 mr-1.5" />
                Install
              </Button>
            )}
            {iosHint && (
              <Button
                onClick={() => dismiss(true)}
                className="w-full rounded-full"
                type="button"
              >
                Got it
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
