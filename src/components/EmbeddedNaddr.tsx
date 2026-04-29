import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { cn } from '@/lib/utils';
import type { AddrCoords } from '@/components/NoteContent';
import { TreasureCard, TREASURE_KIND } from '@/components/TreasureCard';

interface EmbeddedNaddrProps {
  addr: AddrCoords;
  /** Optional original URL the naddr was extracted from. */
  sourceUrl?: string;
  className?: string;
}

/**
 * Embedded-naddr card. Delegates to kind-specific renderers when we
 * know how to draw a rich preview (e.g. Treasures, kind 37515);
 * otherwise falls back to a minimal link to the event.
 */
export function EmbeddedNaddr({ addr, sourceUrl, className }: EmbeddedNaddrProps) {
  // Kind-specific rich previews.
  if (addr.kind === TREASURE_KIND) {
    return <TreasureCard coord={addr} sourceUrl={sourceUrl} className={className} />;
  }

  const naddrId = nip19.naddrEncode({
    kind: addr.kind,
    pubkey: addr.pubkey,
    identifier: addr.identifier,
  });

  return (
    <Link
      to={`/${naddrId}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'block border rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-sm',
        className,
      )}
    >
      <div className="font-medium">Addressable event</div>
      <div className="text-xs text-muted-foreground font-mono truncate">
        kind:{addr.kind} · {addr.identifier || '(no identifier)'}
      </div>
    </Link>
  );
}
