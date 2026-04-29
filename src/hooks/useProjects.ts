import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { AOS_HASHTAG, PROJECT_KIND } from "@/lib/constants";
import { parseProject, type Project } from "@/lib/project";

/** Fetch all project submissions tagged #aosconvergence. */
export function useProjects() {
  const { nostr } = useNostr();

  return useQuery<Project[]>({
    queryKey: ["projects", AOS_HASHTAG],
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [
          {
            kinds: [PROJECT_KIND],
            "#t": [AOS_HASHTAG],
            limit: 200,
          },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      // For addressable events, keep only the latest per pubkey+d coordinate.
      const latest = new Map<string, (typeof events)[number]>();
      for (const e of events) {
        const d = e.tags.find(([n]) => n === "d")?.[1] ?? "";
        const coord = `${e.pubkey}:${d}`;
        const existing = latest.get(coord);
        if (!existing || e.created_at > existing.created_at) {
          latest.set(coord, e);
        }
      }

      return [...latest.values()]
        .map(parseProject)
        .filter((p): p is Project => p !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 30_000,
  });
}
