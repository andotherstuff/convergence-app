import { ZapDialog } from '@/components/ZapDialog';
import { useZaps, type ProfileZapTarget } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Zap } from 'lucide-react';
import type { Event } from 'nostr-tools';

interface ZapButtonProps {
  /** An event to zap, or a `{ pubkey }` object for a profile zap. */
  target: Event | ProfileZapTarget;
  className?: string;
  showCount?: boolean;
  zapData?: { count: number; totalSats: number; isLoading?: boolean };
  /**
   * Label shown when the zap count is zero. Defaults to "Zap".
   * Passing e.g. "Support" makes sense on profile zap buttons.
   */
  label?: string;
}

export function ZapButton({
  target,
  className = "text-xs ml-1",
  showCount = true,
  zapData: externalZapData,
  label = 'Zap',
}: ZapButtonProps) {
  const { user } = useCurrentUser();
  const { data: author } = useAuthor(target?.pubkey || '');
  const { webln, activeNWC } = useWallet();

  // Only fetch data if not provided externally
  const { totalSats: fetchedTotalSats, isLoading } = useZaps(
    externalZapData ? [] : target,
    webln,
    activeNWC
  );

  // Don't show zap button if user is not logged in, is the author, or author has no lightning address
  if (
    !user ||
    !target ||
    user.pubkey === target.pubkey ||
    (!author?.metadata?.lud16 && !author?.metadata?.lud06)
  ) {
    return null;
  }

  // Use external data if provided, otherwise use fetched data
  const totalSats = externalZapData?.totalSats ?? fetchedTotalSats;
  const showLoading = externalZapData?.isLoading || isLoading;

  return (
    <ZapDialog target={target}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ${className}`}
        aria-label={
          showCount && totalSats > 0
            ? `Zap — ${totalSats.toLocaleString()} sats`
            : label
        }
      >
        <Zap className="size-3.5" />
        <span className="text-xs tabular-nums font-medium">
          {showLoading ? (
            '...'
          ) : showCount && totalSats > 0 ? (
            totalSats.toLocaleString()
          ) : (
            label
          )}
        </span>
      </button>
    </ZapDialog>
  );
}