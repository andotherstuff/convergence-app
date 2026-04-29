import { useLocalNotifier } from "@/hooks/useLocalNotifier";

/**
 * Headless component that mounts the local notifier hook at the root
 * of the app. Rendered once inside `App.tsx` so the subscription
 * lives for the lifetime of the page regardless of which route the
 * user is on.
 */
export function NotificationBridge() {
  useLocalNotifier();
  return null;
}
