import { instagramProfileUrl, cn } from "@/lib/utils";

/** Clickable @username that always opens the Instagram profile in a new tab. */
export function InstagramHandle({ username, url, className }: { username?: string; url?: string; className?: string }) {
  if (!username && !url) return null;
  const handle = (username || "").replace(/^@/, "");
  return (
    <a
      href={instagramProfileUrl(url || handle)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn("hover:text-foreground hover:underline", className)}
    >
      @{handle}
    </a>
  );
}
