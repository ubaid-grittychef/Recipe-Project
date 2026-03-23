"use client";

const STORAGE_KEY = "bookmarked_recipes";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}

export function toggleBookmark(slug: string): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(slug);
  if (index >= 0) {
    bookmarks.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("bookmarks-changed"));
    }
    return false;
  } else {
    bookmarks.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("bookmarks-changed"));
    }
    return true;
  }
}

export function getBookmarkCount(): number {
  return getBookmarks().length;
}
