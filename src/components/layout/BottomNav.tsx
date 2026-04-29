import { NavLink } from "react-router-dom";
import { Home, Megaphone, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    to: "/announcements",
    label: "Announcements",
    icon: Megaphone,
  },
  {
    to: "/",
    label: "Home",
    icon: Home,
    end: true,
  },
  {
    to: "/projects",
    label: "Projects",
    icon: Rocket,
  },
];

/**
 * Mobile-only bottom navigation. Renders as a fixed thumb-reachable
 * tab bar below the viewport with icons for the three primary
 * destinations. Hidden on md+ breakpoints (desktop uses the header
 * thumbnav instead).
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-40",
        "border-t border-border bg-background/95 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-1",
                  "text-[11px] font-medium transition-colors",
                  "min-h-14",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center size-9 rounded-full transition-colors",
                      isActive ? "bg-foreground text-background" : ""
                    )}
                  >
                    <Icon className="size-[1.1rem]" strokeWidth={2} />
                  </span>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
