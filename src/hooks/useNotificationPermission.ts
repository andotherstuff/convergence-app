import { useCallback, useEffect, useState } from "react";

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Read the current browser notification permission state. Returns
 * "unsupported" on environments without the Notification API (e.g.
 * some in-app browsers and certain privacy-hardened configurations).
 */
function readPermission(): NotificationPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

/**
 * Thin wrapper around the browser Notification permission state.
 *
 * `request()` prompts the user if the current state is "default" and
 * updates local state based on the outcome. Browsers disallow calling
 * `Notification.requestPermission()` after a denial, so `request()`
 * simply returns the current value in that case.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => readPermission()
  );

  // Some browsers (Firefox) fire a `permissionchange` event on the
  // PermissionStatus object. Poll for changes otherwise — cheap, and
  // only runs while the component is mounted.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    let status: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        const update = () => {
          setPermission(readPermission());
        };
        s.addEventListener("change", update);
      })
      .catch(() => {
        /* permission API not available; ignore */
      });

    return () => {
      cancelled = true;
      status?.removeEventListener("change", () => setPermission(readPermission()));
    };
  }, []);

  const request = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission !== "default") {
      const current = Notification.permission as NotificationPermissionState;
      setPermission(current);
      return current;
    }
    try {
      const result = (await Notification.requestPermission()) as NotificationPermissionState;
      setPermission(result);
      return result;
    } catch {
      // Older Safari uses the callback style; fall through and re-read.
      const current = readPermission();
      setPermission(current);
      return current;
    }
  }, []);

  return {
    permission,
    request,
    isSupported: permission !== "unsupported",
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
}
