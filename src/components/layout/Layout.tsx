import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  /** Apply the subtle hero radial gradient at the top of the page (home only). */
  hero?: boolean;
}

export function Layout({ children, hero = false }: LayoutProps) {
  return (
    // Reserve space on mobile for the fixed bottom nav so content and the
    // footer aren't hidden behind it.
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />
      <main className={cn("flex-1", hero && "aos-hero-bg")}>{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
