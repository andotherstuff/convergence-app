import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LoginArea } from "@/components/auth/LoginArea";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Feed", end: true },
  { to: "/schedule", label: "Schedule" },
  { to: "/projects", label: "Projects" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/90 border-b border-border">
      <div className="aos-shell">
        <nav className="flex items-center justify-between gap-4 py-3 md:py-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0"
            onClick={() => setOpen(false)}
          >
            <div className="size-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 64 64"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="22" cy="32" r="11" className="text-background" />
                <circle cx="42" cy="32" r="11" className="text-background" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                AOS
              </span>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Convergence
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn("aos-nav-link", isActive && "active")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LoginArea className="max-w-60" />
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden p-2 -mr-2 text-foreground"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 pt-1 border-t border-border -mx-1">
            <div className="flex flex-col gap-1 pt-2">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2.5 rounded-md text-base font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-3 px-1">
                <LoginArea className="w-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
