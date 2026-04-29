import type { NostrEvent } from "@nostrify/nostrify";
import { PROJECT_KIND } from "@/lib/constants";
import { isAnnouncement } from "@/hooks/useAosFeed";
import { FeedPost } from "./FeedPost";
import { FeedProjectCard } from "./FeedProjectCard";
import { FeedComment } from "./FeedComment";

interface FeedItemProps {
  event: NostrEvent;
}

/** Routes an event to the right feed-item renderer based on its kind. */
export function FeedItem({ event }: FeedItemProps) {
  if (event.kind === PROJECT_KIND) {
    return <FeedProjectCard event={event} />;
  }
  if (event.kind === 1111) {
    return <FeedComment event={event} />;
  }
  if (event.kind === 1) {
    return <FeedPost event={event} isAnnouncement={isAnnouncement(event)} />;
  }
  return null;
}
