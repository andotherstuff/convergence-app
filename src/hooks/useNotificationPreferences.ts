import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Which categories of events should fire a notification.
 *
 * - `posts`         → any kind-1 note tagged #aosconvergence
 * - `projects`      → any kind-38459 project submission tagged #aosconvergence
 * - `announcements` → organizer-authored announcements
 *
 * `enabled` is a master switch. When false, the individual sub-toggles
 * are ignored and no notifications fire.
 */
export interface NotificationPreferences {
  enabled: boolean;
  posts: boolean;
  projects: boolean;
  announcements: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  posts: false,
  projects: false,
  announcements: true,
};

const LS_KEY = "aos:notification-prefs";

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useLocalStorage<NotificationPreferences>(
    LS_KEY,
    DEFAULT_NOTIFICATION_PREFS
  );

  const setPref = useCallback(
    <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K]
    ) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    [setPrefs]
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULT_NOTIFICATION_PREFS);
  }, [setPrefs]);

  return { prefs, setPrefs, setPref, reset };
}

/** Are any sub-categories enabled in these prefs? */
export function hasAnyCategoryEnabled(prefs: NotificationPreferences): boolean {
  return prefs.posts || prefs.projects || prefs.announcements;
}
