"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";

interface BookmarkButtonProps {
  slug: string;
  initialBookmarked: boolean;
  initialCount: number;
  signedIn: boolean;
}

export function BookmarkButton({
  slug,
  initialBookmarked,
  initialCount,
  signedIn,
}: BookmarkButtonProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (!signedIn) {
      router.push("/auth");
      return;
    }
    setPending(true);
    const prevBookmarked = bookmarked;
    const prevCount = count;
    setBookmarked(!prevBookmarked);
    setCount(prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await fetch(`/api/products/${slug}/bookmark`, {
        method: "POST",
      });
      if (!res.ok) {
        setBookmarked(prevBookmarked);
        setCount(prevCount);
      } else {
        const data = (await res.json()) as { bookmarked: boolean; count: number };
        setBookmarked(data.bookmarked);
        setCount(data.count);
      }
    } catch {
      setBookmarked(prevBookmarked);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleToggle}
      title="Save to shortlist (bookmarks do not drive rankings)"
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs tabular transition-colors ${
        bookmarked
          ? "border-ink bg-ink text-canvas"
          : "border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink"
      }`}
    >
      <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
      <span>{count}</span>
    </button>
  );
}
