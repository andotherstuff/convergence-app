import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useEventDetails } from "@/hooks/useEventDetails";
import {
  flattenSchedule,
  getZonedNow,
  matchNow,
  type NowState,
} from "@/lib/scheduleNow";
import { cn } from "@/lib/utils";

/**
 * "What's happening now?" banner. Self-contained: pulls the schedule from
 * the shared worker (via {@link useEventDetails}) and ticks every 30s to
 * keep the countdown fresh.
 *
 * Renders nothing when:
 *  - the user is logged out or not on the approved attendee list (no
 *    point teasing data they can't access);
 *  - the schedule is still loading or errored;
 *  - the event window is over.
 */
export function NowHappening({ className }: { className?: string }) {
  const { data, isLoading, error } = useEventDetails();
  const [now, setNow] = useState(() => new Date());

  // Tick every 30 seconds. Cheap; matches the user-perceptible cadence
  // of minute-boundary transitions.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const state = useMemo<NowState | null>(() => {
    if (!data) return null;
    const items = flattenSchedule(data.schedule);
    const zonedNow = getZonedNow(now, data.timezone ?? "Europe/Oslo");
    return matchNow(zonedNow, items);
  }, [data, now]);

  if (isLoading || error || !state) return null;
  if (state.state === "after") return null;

  const { label, title, sub } = describe(state);

  return (
    <Link
      to="/schedule"
      aria-live="polite"
      className={cn(
        "group block bg-card rounded-[18px] border border-border shadow-sm",
        "px-4 py-3 hover:bg-secondary/40 transition-colors",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center size-9 rounded-full bg-secondary shrink-0">
          <CalendarDays
            className="size-[1.05rem] text-muted-foreground"
            strokeWidth={2}
          />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div className="text-sm font-semibold text-foreground truncate">
            {title}
          </div>
          {sub && (
            <div className="text-xs text-muted-foreground truncate">{sub}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

function describe(state: NowState): {
  label: string;
  title: string;
  sub: string | null;
} {
  switch (state.state) {
    case "before":
      return {
        label: "Starts",
        title: state.next.event,
        sub: `${state.next.day} · ${state.next.time} Oslo · ${formatCountdown(state.minutesUntilStart, "until start")}`,
      };
    case "current":
      return {
        label: "Now",
        title: state.current.event,
        sub: `${state.current.time} Oslo · ${formatCountdown(state.minutesUntilEnd, "remaining")}`,
      };
    case "upcoming":
      return {
        label: "Up next",
        title: state.next.event,
        sub: `${state.next.time} Oslo · ${formatCountdown(state.minutesUntilNext, "from now")}`,
      };
    case "after":
      // Never rendered (caller returns null), but exhaustiveness check.
      return { label: "", title: "", sub: null };
  }
}

function formatCountdown(minutes: number, suffix: string): string {
  if (minutes < 1) return `under a minute ${suffix}`;
  if (minutes < 60) return `${minutes} min ${suffix}`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours < 24) {
    if (remaining === 0) {
      return `${hours} hr ${suffix}`;
    }
    return `${hours} hr ${remaining} min ${suffix}`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days < 2 && remHours > 0) {
    return `${days} day ${remHours} hr ${suffix}`;
  }
  if (days === 1) return `1 day ${suffix}`;
  return `${days} days ${suffix}`;
}
