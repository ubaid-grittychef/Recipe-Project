"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw, Search } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev; in production this would go to an error service
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500">
        <AlertTriangle className="h-10 w-10" />
      </div>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl font-heading">
        Something went wrong
      </h1>
      <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
        We hit an unexpected error loading this page. This is usually temporary
        &mdash; try refreshing, or head back to a working page.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-slate-400">
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Search className="h-4 w-4" />
          Search
        </Link>
      </div>
    </div>
  );
}
