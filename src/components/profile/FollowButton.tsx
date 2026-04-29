import { useMemo } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowList } from "@/hooks/useFollowList";
import { useToggleFollow } from "@/hooks/useToggleFollow";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  pubkey: string;
  className?: string;
  size?: "sm" | "default";
}

export function FollowButton({
  pubkey,
  className,
  size = "default",
}: FollowButtonProps) {
  const { user } = useCurrentUser();
  const { data, isLoading } = useFollowList(user?.pubkey);
  const { mutate: toggle, isPending } = useToggleFollow();
  const { toast } = useToast();

  const isFollowing = useMemo(
    () => !!data?.following.includes(pubkey),
    [data, pubkey]
  );

  // Don't render on the viewer's own profile
  if (user?.pubkey === pubkey) return null;

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Sign in to follow",
        description: "You need a Nostr account to follow other users.",
      });
      return;
    }
    toggle(
      { target: pubkey, follow: !isFollowing },
      {
        onError: (err) => {
          toast({
            title: isFollowing
              ? "Couldn't unfollow"
              : "Couldn't follow",
            description: err instanceof Error ? err.message : String(err),
            variant: "destructive",
          });
        },
      }
    );
  };

  const busy = isPending || (!!user && isLoading);

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={busy}
      variant={isFollowing ? "outline" : "default"}
      size={size}
      className={cn("rounded-full", className)}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="size-3.5 mr-1.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="size-3.5 mr-1.5" />
          Follow
        </>
      )}
    </Button>
  );
}
