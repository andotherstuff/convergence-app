import { useMemo, useState, type ReactNode } from "react";
import { nip19 } from "nostr-tools";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "@/components/ui/qrcode";
import { useAppContext } from "@/hooks/useAppContext";
import { useToast } from "@/hooks/useToast";

interface ShareProfileDialogProps {
  pubkey: string;
  displayName: string;
  children: ReactNode;
}

/**
 * Share-your-profile QR dialog. Used on the viewer's OWN profile so
 * they can show their QR to someone IRL who wants to follow them.
 * Encodes an `nprofile` with the user's preferred relay hints, wrapped
 * in the `nostr:` URI so standard Nostr scanners pick it up.
 */
export function ShareProfileDialog({
  pubkey,
  displayName,
  children,
}: ShareProfileDialogProps) {
  const { config } = useAppContext();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { nprofile, npub, qrValue } = useMemo(() => {
    const relays = config.relayMetadata.relays
      .filter((r) => r.read)
      .map((r) => r.url)
      .slice(0, 3);
    const nprofile = nip19.nprofileEncode({ pubkey, relays });
    const npub = nip19.npubEncode(pubkey);
    return {
      nprofile,
      npub,
      qrValue: `nostr:${nprofile}`,
    };
  }, [pubkey, config.relayMetadata.relays]);

  const copyNpub = async () => {
    try {
      await navigator.clipboard.writeText(npub);
      setCopied(true);
      toast({ title: "Copied npub to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">Share your profile</DialogTitle>
          <DialogDescription>
            Let someone scan this QR to follow {displayName} on Nostr.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pb-2 min-w-0 w-full">
          <div
            className="bg-white p-3 rounded-xl border border-border"
            style={{ width: "100%", maxWidth: 240 }}
          >
            <QRCodeCanvas
              value={qrValue}
              level="M"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          <div className="w-full min-w-0 space-y-1.5">
            <div className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Your npub
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <code className="flex-1 min-w-0 text-xs font-mono bg-secondary/60 rounded-md px-2.5 py-1.5 text-muted-foreground truncate">
                {npub}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyNpub}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
