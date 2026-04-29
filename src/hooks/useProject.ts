import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { PROJECT_KIND } from "@/lib/constants";
import { parseProject, type Project } from "@/lib/project";

interface ProjectCoords {
  pubkey: string;
  identifier: string;
}

/**
 * Fetch a single project by author pubkey + d-tag identifier.
 * Filters by author to prevent d-tag spoofing.
 */
export function useProject(coords: ProjectCoords | null) {
  const { nostr } = useNostr();

  return useQuery<Project | null>({
    queryKey: ["project", coords?.pubkey, coords?.identifier],
    queryFn: async ({ signal }) => {
      if (!coords) return null;
      const events = await nostr.query(
        [
          {
            kinds: [PROJECT_KIND],
            authors: [coords.pubkey],
            "#d": [coords.identifier],
            limit: 1,
          },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );
      const event = events[0];
      if (!event) return null;
      return parseProject(event);
    },
    enabled: !!coords,
    staleTime: 60_000,
  });
}
