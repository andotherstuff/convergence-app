import { nip19 } from "nostr-tools";
import { Link, Navigate, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { PROJECT_KIND } from "@/lib/constants";
import NotFound from "./NotFound";

function ProfileView({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const picture = metadata?.picture;
  const about = metadata?.about;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;

  return (
    <Layout>
      <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24 max-w-2xl">
        {metadata?.banner && (
          <div className="aspect-[3/1] bg-secondary rounded-2xl overflow-hidden mb-6 border border-border">
            <img
              src={metadata.banner}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start gap-4 mb-6">
          <Avatar className="size-20 md:size-24 border border-border shrink-0">
            <AvatarImage src={picture} alt={displayName} />
            <AvatarFallback className="text-xl bg-secondary">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pt-2">
            <h1 className="aos-title text-2xl md:text-3xl mb-1">
              {displayName}
            </h1>
            {nip05 && (
              <p className="text-sm text-muted-foreground">
                {nip05.replace(/^_@/, "")}
              </p>
            )}
          </div>
        </div>

        {about && (
          <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap mb-5 text-foreground">
            {about}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm aos-link inline-flex items-center gap-1.5"
            >
              {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <div className="pt-6 border-t border-border">
          <Button asChild variant="outline">
            <Link to="/">Back to feed</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case "npub":
      return <ProfileView pubkey={decoded.data} />;

    case "nprofile":
      return <ProfileView pubkey={decoded.data.pubkey} />;

    case "naddr": {
      // If it points to one of our projects, route there
      if (decoded.data.kind === PROJECT_KIND) {
        return <Navigate to={`/projects/${identifier}`} replace />;
      }
      return (
        <Layout>
          <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24 max-w-xl">
            <div className="aos-kicker mb-2">Addressable event</div>
            <h1 className="aos-title mb-4">Event preview</h1>
            <p className="aos-body mb-6">
              This addressable event (kind {decoded.data.kind}) isn't handled
              directly by this app.
            </p>
            <div className="aos-card p-4 text-xs font-mono break-all text-muted-foreground">
              {identifier}
            </div>
          </section>
        </Layout>
      );
    }

    case "note":
    case "nevent":
      return (
        <Layout>
          <section className="aos-shell pt-10 md:pt-16 pb-16 md:pb-24 max-w-xl">
            <div className="aos-kicker mb-2">Event</div>
            <h1 className="aos-title mb-4">Event preview</h1>
            <p className="aos-body mb-6">
              Single-event view isn't implemented yet. Browse the main feed
              instead.
            </p>
            <div className="aos-card p-4 text-xs font-mono break-all text-muted-foreground mb-6">
              {identifier}
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back to feed</Link>
            </Button>
          </section>
        </Layout>
      );

    default:
      return <NotFound />;
  }
}
