import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  CalendarDays,
  ExternalLink,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  UserIcon,
  UserPlus,
  X,
} from "lucide-react";
import { nip19 } from "nostr-tools";
import AuthDialog from "@/components/auth/AuthDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useLoggedInAccounts,
  type Account,
} from "@/hooks/useLoggedInAccounts";
import { genUserName } from "@/lib/genUserName";
import { PROGRAM_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/announcements", label: "Announcements" },
  { to: "/", label: "Home", end: true },
  { to: "/projects", label: "Projects" },
];

function getDisplayName(account: Account): string {
  return account.metadata.name ?? genUserName(account.pubkey);
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { currentUser, otherUsers, setLogin, removeLogin } =
    useLoggedInAccounts();

  const closeMenu = () => setOpen(false);

  const openAuth = () => {
    closeMenu();
    setAuthDialogOpen(true);
  };

  const handleLogout = () => {
    if (!currentUser) return;
    removeLogin(currentUser.id);
    closeMenu();
  };

  const handleSwitch = (id: string) => {
    setLogin(id);
    closeMenu();
  };

  const profileHref = currentUser
    ? `/${nip19.npubEncode(currentUser.pubkey)}`
    : null;

  // Dismiss the menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/90 border-b border-border">
      <div className="aos-shell relative">
        <nav className="flex items-center justify-between gap-4 py-3 md:py-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0"
            onClick={closeMenu}
          >
            <img
              src="/AOS_Official.svg"
              alt=""
              className="size-10 rounded-xl shrink-0 dark:invert"
              width={40}
              height={40}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                AOS
              </span>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Convergence
              </span>
            </div>
          </Link>

          {/* Desktop thumbnav — Announcements | Home | Projects */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-full border border-border bg-background/60 shadow-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right cluster — universal hamburger button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-full hover:bg-accent transition-colors text-foreground"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {currentUser ? (
                <Avatar className="size-8">
                  <AvatarImage
                    src={currentUser.metadata.picture}
                    alt={getDisplayName(currentUser)}
                  />
                  <AvatarFallback>
                    {getDisplayName(currentUser).charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                  <UserIcon className="size-4 text-muted-foreground" />
                </span>
              )}
              {open ? (
                <X className="size-4 text-muted-foreground" />
              ) : (
                <Menu className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </nav>

        {/* Unified menu panel — floats over the page as a popover. */}
        {open && (
          <>
            {/* Backdrop — click to dismiss. Starts just below the header
                so the hamburger button stays interactive and visible. */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="fixed inset-0 top-full z-30 bg-foreground/10 backdrop-blur-[1px] cursor-default"
            />
            <div
              role="menu"
              aria-label="Account menu"
              className={cn(
                "absolute z-40 right-4 md:right-6 top-full mt-2",
                "w-[min(22rem,calc(100vw-2rem))]",
                "rounded-xl border border-border bg-background shadow-lg",
                "p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
              )}
            >
              {/* Program — external link to the canonical event
                  schedule. Opens in a new tab so the user doesn't lose
                  their place inside the app. Shown at the top of the
                  menu because it's the single most-referenced link
                  during the event. */}
              <a
                href={PROGRAM_URL}
                target="_blank"
                rel="noreferrer noopener"
                onClick={closeMenu}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors"
              >
                <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                  <CalendarDays className="size-4 text-muted-foreground" />
                </span>
                <span className="text-sm font-medium flex-1">Program</span>
                <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
              </a>

              <div className="h-px bg-border my-2" />

              {/* Account section
                  (On mobile, primary nav lives in the fixed BottomNav —
                  so the hamburger panel is purely for account actions.) */}
              {/* Settings link — always visible (notifications etc. don't
                  require login). Rendered as a normal row so its spacing
                  matches other menu items. */}
              {currentUser && profileHref ? null : (
                <Link
                  to="/settings"
                  onClick={closeMenu}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors"
                >
                  <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                    <SettingsIcon className="size-4 text-muted-foreground" />
                  </span>
                  <span className="text-sm font-medium">Settings</span>
                </Link>
              )}
              {currentUser && profileHref ? (
                <>
                  {/* Current profile header */}
                  <Link
                    to={profileHref}
                    onClick={closeMenu}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors"
                  >
                    <Avatar className="size-10">
                      <AvatarImage
                        src={currentUser.metadata.picture}
                        alt={getDisplayName(currentUser)}
                      />
                      <AvatarFallback>
                        {getDisplayName(currentUser).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {getDisplayName(currentUser)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        View my profile
                      </p>
                    </div>
                  </Link>

                  {/* Other accounts */}
                  {otherUsers.length > 0 && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Switch account
                      </div>
                      {otherUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSwitch(user.id)}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors text-left"
                        >
                          <Avatar className="size-8">
                            <AvatarImage
                              src={user.metadata.picture}
                              alt={getDisplayName(user)}
                            />
                            <AvatarFallback>
                              {getDisplayName(user).charAt(0) || <UserIcon />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">
                            {getDisplayName(user)}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  <div className="h-px bg-border my-2" />

                  <Link
                    to="/settings"
                    onClick={closeMenu}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors"
                  >
                    <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                      <SettingsIcon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={openAuth}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors text-left"
                  >
                    <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                      <UserPlus className="size-4 text-muted-foreground" />
                    </span>
                    <span className="text-sm font-medium">
                      Add another account
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors text-left text-red-500"
                  >
                    <span className="flex items-center justify-center size-8 rounded-full bg-secondary">
                      <LogOut className="size-4" />
                    </span>
                    <span className="text-sm font-medium">Log out</span>
                  </button>
                </>
              ) : (
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in with Nostr to post, follow, and react.
                  </p>
                  <Button onClick={openAuth} className="w-full rounded-full">
                    Join
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />
    </header>
  );
}
