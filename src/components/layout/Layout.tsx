import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  /** Apply the subtle hero radial gradient at the top of the page (home only). */
  hero?: boolean;
}

export function Layout({ children, hero = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={hero ? "aos-hero-bg flex-1" : "flex-1"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
