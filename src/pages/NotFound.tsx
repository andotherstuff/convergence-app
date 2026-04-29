import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "404 · AOS Convergence",
    description:
      "The page you are looking for could not be found. Return to the home page to continue browsing.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <section className="aos-shell py-24 md:py-32 text-center">
        <div className="max-w-md mx-auto">
          <div className="aos-kicker mb-3">404</div>
          <h1 className="aos-display mb-4">Not found</h1>
          <p className="aos-body mb-8">
            The page you're looking for doesn't exist, or it may have moved.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
