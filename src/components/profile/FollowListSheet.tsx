import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { genUserName } from "@/lib/genUserName";
import { FollowButton } from "./FollowButton";

type Mode = "following" | "followers";

interface FollowListSheetProps {
  children: ReactNode;
  mode: Mode;
  /** The profile the list belongs to — used in the sheet title. */
  displayName: string;
  /** The pubkeys to show. */
  pubkeys: string[];
  /** True if we hit a query cap and the real count is higher. */
  atCap?: boolean;
  isLoading?: boolean;
}

export function FollowListSheet({
  children,
  mode,
  displayName,
  pubkeys,
  atCap = false,
  isLoading = false,
}: FollowListSheetProps) {
  const [open, setOpen] = useState(false);

  const title = mode === "following" ? "Following" : "Followers";
  const subtitle =
    mode === "following"
      ? `People ${displayName} follows`
      : `People who follow ${displayName}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle>
            {title}{" "}
            <span className="text-muted-foreground font-normal">
              ({pubkeys.length}
              {atCap && "+"})
            </span>
          </SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isLoading && pubkeys.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {mode === "following"
                ? `${displayName} isn't following anyone yet.`
                : `No one is following ${displayName} yet.`}
            </div>
          )}

          <ul className="divide-y divide-border">
            {pubkeys.map((pk) => (
              <FollowRow key={pk} pubkey={pk} onNavigate={() => setOpen(false)} />
            ))}
          </ul>

          {atCap && (
            <div className="p-4 text-center text-xs text-muted-foreground border-t border-border">
              Showing the first {pubkeys.length} results.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FollowRow({
  pubkey,
  onNavigate,
}: {
  pubkey: string;
  onNavigate: () => void;
}) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const nip05 = metadata?.nip05;
  const about = metadata?.about;
  const picture = metadata?.picture;
  const npub = nip19.npubEncode(pubkey);

  return (
    <li>
      <div className="flex items-start gap-3 px-5 py-3">
        <SheetClose asChild>
          <Link
            to={`/${npub}`}
            onClick={onNavigate}
            className="shrink-0"
          >
            <Avatar className="size-10 border border-border">
              <AvatarImage src={picture} alt={displayName} />
              <AvatarFallback className="text-xs bg-secondary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </SheetClose>

        <div className="flex-1 min-w-0">
          <SheetClose asChild>
            <Link
              to={`/${npub}`}
              onClick={onNavigate}
              className="block"
            >
              <div className="font-semibold text-sm text-foreground hover:underline truncate">
                {displayName}
              </div>
              {nip05 && (
                <div className="text-xs text-muted-foreground truncate">
                  {nip05.replace(/^_@/, "")}
                </div>
              )}
            </Link>
          </SheetClose>
          {about && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {about}
            </p>
          )}
        </div>

        <FollowButton pubkey={pubkey} size="sm" className="shrink-0 self-start" />
      </div>
    </li>
  );
}
