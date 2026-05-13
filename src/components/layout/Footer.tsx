import { Link } from "react-router-dom";
import {
  WEBSITE_ABOUT_URL,
  WEBSITE_APPLY_URL,
  WEBSITE_URL,
} from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border mt-16 md:mt-24 py-8 bg-background">
      <div className="aos-shell">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              AOS Convergence · Oslo 2026
            </p>
            <p>May 29 – 31, 2026 · Oslo, Norway</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/" className="aos-nav-link">
              Feed
            </Link>
            <Link to="/projects" className="aos-nav-link">
              Projects
            </Link>
            <Link to="/schedule" className="aos-nav-link">
              Schedule
            </Link>
            <a
              href={WEBSITE_ABOUT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="aos-nav-link"
            >
              About ↗
            </a>
            <a
              href={WEBSITE_APPLY_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="aos-nav-link"
            >
              Apply ↗
            </a>
            <a
              href={WEBSITE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="aos-nav-link"
            >
              Official site ↗
            </a>
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noreferrer noopener"
              className="aos-nav-link"
            >
              Vibed with Shakespeare
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
