import { useSeoMeta } from "@unhead/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { Layout } from "@/components/layout/Layout";
import { NowHappening } from "@/components/schedule/NowHappening";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/auth/AuthDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import {
  useEventDetails,
  EVENT_DETAILS_ERRORS,
} from "@/hooks/useEventDetails";
import { WEBSITE_PROGRAM_FLOW_URL } from "@/lib/constants";

const Schedule = () => {
  useSeoMeta({
    title: "Schedule · AOS Convergence Oslo 2026",
    description:
      "Three-day timed agenda for AOS Convergence — visible to approved attendees signed in with Nostr.",
  });

  const { user } = useCurrentUser();
  const { currentUser, removeLogin } = useLoggedInAccounts();
  const { data, isLoading, error } = useEventDetails();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  /**
   * Switch accounts: log the current (wrong) account out, then open the
   * auth dialog so the user can sign in with the correct npub. We remove
   * first so the newly-added login lands at position 0 and becomes the
   * active user — `addLogin` appends to the bottom otherwise.
   */
  const handleSwitchAccount = () => {
    if (currentUser) removeLogin(currentUser.id);
    setAuthDialogOpen(true);
  };

  return (
    <Layout>
      <section className="aos-shell pt-8 md:pt-12 pb-24">
        <header className="mb-6 md:mb-8">
          <div className="aos-kicker mb-2">Schedule</div>
          <h1 className="aos-display text-3xl md:text-4xl">
            Three-day agenda
          </h1>
          <p className="aos-body text-muted-foreground mt-3 max-w-xl">
            All times are Europe/Oslo. Visible to approved attendees signed
            in with Nostr.
          </p>
        </header>

        {/* Now-happening banner sits above all states so it can show its
            own "log in" affordance via the parent body below if needed. */}
        {data && <NowHappening className="mb-6 md:mb-8" />}

        {/* State 1 — not logged in */}
        {!user && (
          <LoginPrompt onOpenAuth={() => setAuthDialogOpen(true)} />
        )}

        {/* State 2 — logged in, loading */}
        {user && isLoading && <ScheduleSkeleton />}

        {/* State 3 — logged in, not approved */}
        {user && error?.message === EVENT_DETAILS_ERRORS.NOT_APPROVED && (
          <NotApprovedCard
            pubkey={user.pubkey}
            onSwitchAccount={handleSwitchAccount}
          />
        )}

        {/* State 4 — logged in, other error */}
        {user &&
          error &&
          error.message !== EVENT_DETAILS_ERRORS.NOT_APPROVED &&
          error.message !== EVENT_DETAILS_ERRORS.NOT_LOGGED_IN && (
            <ErrorCard message={error.message} />
          )}

        {/* State 5 — logged in, approved, schedule loaded */}
        {data && (
          <div className="space-y-3">
            {data.schedule.map((day) => (
              <div
                key={day.day}
                className="bg-card rounded-[18px] p-5 border border-border shadow-sm"
              >
                <h2 className="text-sm font-semibold text-foreground mb-0.5">
                  {day.day}
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  {day.subtitle}
                </p>
                <div className="space-y-2">
                  {day.items.map((item, idx) => (
                    <div key={`${item.time}-${idx}`} className="flex gap-4">
                      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5 tabular-nums">
                        {item.time}
                      </span>
                      <span className="text-sm text-foreground">
                        {item.event}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Times are approximate and may shift. Final schedule is
              confirmed in the Signal group.
            </p>
          </div>
        )}
      </section>

      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />
    </Layout>
  );
};

function LoginPrompt({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <div className="bg-card rounded-[18px] border border-border shadow-sm p-6 md:p-8 max-w-xl">
      <h2 className="text-base font-semibold text-foreground mb-2">
        Sign in to see the schedule
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        The detailed agenda is shared only with approved attendees. Sign in
        with your Nostr account to view it.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onOpenAuth} className="rounded-full">
          Sign in with Nostr
        </Button>
        <a
          href={WEBSITE_PROGRAM_FLOW_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center px-4 h-10 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          See the public overview ↗
        </a>
      </div>
    </div>
  );
}

function NotApprovedCard({
  pubkey,
  onSwitchAccount,
}: {
  pubkey: string;
  onSwitchAccount: () => void;
}) {
  const npub = nip19.npubEncode(pubkey);
  return (
    <div className="bg-card rounded-[18px] border border-border shadow-sm p-6 md:p-8 max-w-xl">
      <h2 className="text-base font-semibold text-foreground mb-2">
        This account is not on the approved list
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        The detailed schedule is shared only with approved attendees of AOS
        Convergence. The account you're signed in with is not on that list —
        if you applied with a different Nostr account, sign in with that one
        instead.
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed font-mono break-all bg-secondary/60 rounded-md px-3 py-2 mb-4">
        {npub}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onSwitchAccount} className="rounded-full">
          Sign in with a different account
        </Button>
        <Link
          to="/"
          className="inline-flex items-center px-4 h-10 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Back to the feed
        </Link>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-card rounded-[18px] border border-dashed border-border p-6 md:p-8 max-w-xl">
      <h2 className="text-base font-semibold text-foreground mb-2">
        Couldn't load the schedule
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {message || "Please try again in a moment."}
      </p>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card rounded-[18px] p-5 border border-border shadow-sm"
        >
          <div className="h-3 w-40 bg-secondary rounded mb-2 animate-pulse" />
          <div className="h-2 w-28 bg-secondary rounded mb-4 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex gap-4">
                <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
                <div className="h-3 flex-1 max-w-[60%] bg-secondary rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Schedule;
