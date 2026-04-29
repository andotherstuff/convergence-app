import { useMemo } from "react";
import { useSeoMeta } from "@unhead/react";
import {
  CalendarDays,
  MapPin,
  Clock,
  ExternalLink,
  MessageSquareText,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { useCalendarEvent } from "@/hooks/useCalendarEvent";
import { AOS_SCHEDULE_EVENT } from "@/lib/constants";
import { NoteContent } from "@/components/NoteContent";

function formatDateRange(start: string, end?: string): string {
  // NIP-52 kind 31922 uses YYYY-MM-DD
  const startDate = new Date(start + "T00:00:00");
  const endDate = end ? new Date(end + "T00:00:00") : startDate;

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth =
    sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    const monthDay = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
    });
    return `${monthDay.format(startDate)} – ${endDate.getDate()}, ${startDate.getFullYear()}`;
  }
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

function getTagValue(event: { tags: string[][] }, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getTagValues(event: { tags: string[][] }, name: string): string[] {
  return event.tags
    .filter(([n]) => n === name)
    .map(([, v]) => v)
    .filter(Boolean);
}

const Schedule = () => {
  useSeoMeta({
    title: "Schedule · AOS Convergence",
    description:
      "The three-day schedule for AOS Convergence, Oslo 2026.",
  });

  const { data: event, isLoading, isError } = useCalendarEvent(
    AOS_SCHEDULE_EVENT
  );

  const details = useMemo(() => {
    if (!event) return null;
    return {
      title: getTagValue(event, "title") ?? "AOS Convergence",
      summary: getTagValue(event, "summary"),
      start: getTagValue(event, "start") ?? "",
      end: getTagValue(event, "end"),
      locations: getTagValues(event, "location"),
      geohash: getTagValue(event, "g"),
      lat: getTagValue(event, "lat"),
      lon: getTagValue(event, "lon"),
      image: getTagValue(event, "image"),
      references: getTagValues(event, "r"),
    };
  }, [event]);

  return (
    <Layout>
      <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24">
        <header className="mb-8 md:mb-10">
          <div className="aos-kicker mb-2">Schedule</div>
          <h1 className="aos-display">The Program</h1>
        </header>

        {isLoading && (
          <div className="aos-card p-6 md:p-10 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}

        {isError && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-base font-medium mb-2">
              Couldn't load the schedule
            </p>
            <p className="text-sm text-muted-foreground">
              Check your relay connection and try again.
            </p>
          </div>
        )}

        {!isLoading && !isError && !event && (
          <div className="aos-card border-dashed p-10 text-center">
            <p className="text-base font-medium mb-2">Schedule coming soon</p>
            <p className="text-sm text-muted-foreground">
              The canonical schedule event wasn't found on connected relays.
            </p>
          </div>
        )}

        {event && details && (
          <>
            <article className="aos-card overflow-hidden">
              {details.image && (
                <div className="aspect-[2/1] md:aspect-[3/1] bg-secondary overflow-hidden">
                  <img
                    src={details.image}
                    alt={details.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-10">
                <h2 className="aos-title text-2xl md:text-3xl mb-4">
                  {details.title}
                </h2>

                {/* Meta row */}
                <div className="grid gap-3 md:grid-cols-2 mb-6">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="aos-kicker !text-[0.65rem] mb-0.5">
                        Dates
                      </div>
                      <p className="text-sm font-medium">
                        {formatDateRange(details.start, details.end)}
                      </p>
                    </div>
                  </div>

                  {details.locations[0] && (
                    <div className="flex items-start gap-3">
                      <MapPin className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="aos-kicker !text-[0.65rem] mb-0.5">
                          Location
                        </div>
                        <p className="text-sm font-medium">
                          {details.locations[0]}
                        </p>
                        {details.lat && details.lon && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${details.lat}&mlon=${details.lon}#map=12/${details.lat}/${details.lon}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                          >
                            View on map
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="mb-6" />

                <div className="prose prose-sm max-w-none">
                  <NoteContent
                    event={event}
                    className="text-[0.95rem] leading-relaxed text-foreground"
                  />
                </div>

                {details.references.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="aos-kicker mb-3">Links</div>
                    <ul className="space-y-1.5">
                      {details.references.map((r) => (
                        <li key={r}>
                          <a
                            href={r}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sm text-foreground hover:underline inline-flex items-center gap-1.5"
                          >
                            {r}
                            <ExternalLink className="size-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-8 aos-bg-soft rounded-xl p-4 md:p-5 flex items-start gap-3">
                  <Clock className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detailed session-by-session programming will be announced
                    closer to the event. Subscribe to the{" "}
                    <span className="text-foreground font-medium">
                      #AOSConvergence
                    </span>{" "}
                    feed for updates.
                  </p>
                </div>
              </div>
            </article>

            {/* Comments */}
            <div className="mt-12 md:mt-16">
              <header className="mb-6">
                <div className="aos-kicker mb-2">Discussion</div>
                <h2 className="aos-title flex items-center gap-2">
                  <MessageSquareText className="size-5" />
                  Ask questions, share thoughts
                </h2>
              </header>

              <div className="aos-card p-5 md:p-6">
                <CommentsSection
                  root={event}
                  emptyStateMessage="Start the discussion"
                  emptyStateSubtitle="Be the first to comment on the convergence."
                />
              </div>
            </div>
          </>
        )}
      </section>
    </Layout>
  );
};

export default Schedule;
