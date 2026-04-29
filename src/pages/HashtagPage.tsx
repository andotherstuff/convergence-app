import { Navigate, useParams } from "react-router-dom";
import { AOS_HASHTAG } from "@/lib/constants";
import NotFound from "./NotFound";

/**
 * Hashtag landing. If the hashtag matches our own feed tag, redirect
 * home. Otherwise fall through to the 404 page — we don't have
 * general-purpose hashtag browsing.
 */
export function HashtagPage() {
  const { hashtag } = useParams<{ hashtag: string }>();
  if (!hashtag) return <NotFound />;

  if (hashtag.toLowerCase() === AOS_HASHTAG) {
    return <Navigate to="/" replace />;
  }

  return <NotFound />;
}

export default HashtagPage;
