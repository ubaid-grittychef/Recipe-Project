"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Recipe } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Search, BookOpen, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonRecipeList } from "@/components/Skeleton";

const PAGE_SIZE = 50;

interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function RecipesPage({ params }: Props) {
  const { id } = use(params);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);

  const loadRecipes = useCallback(
    (currentOffset: number, searchQuery: string) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (searchQuery) params.set("search", searchQuery);
      return api
        .get<RecipesResponse>(`/api/projects/${id}/recipes?${params.toString()}`)
        .then((data) => {
          setRecipes(data.recipes ?? []);
          setTotal(data.total ?? 0);
        })
        .catch((err) => {
          console.error("[Recipes] fetch failed:", err);
          toast.error("Failed to load recipes");
          setRecipes([]);
        });
    },
    [id]
  );

  useEffect(() => {
    setLoading(true);
    loadRecipes(0, "").finally(() => setLoading(false));
    setOffset(0);
  }, [id, loadRecipes]);

  // Debounced search — resets to page 1 and queries API
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setOffset(0);
      loadRecipes(0, search).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [search, loadRecipes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function goToPage(newOffset: number) {
    setLoading(true);
    setOffset(newOffset);
    await loadRecipes(newOffset, search);
    setLoading(false);
  }

  async function handleBulkPublish() {
    const draftCount = recipes.filter((r) => r.status === "draft").length;
    if (draftCount === 0) {
      toast.info("No draft recipes to publish");
      return;
    }
    setPublishing(true);
    try {
      const result = await api.post<{ published: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-publish`
      );
      toast.success(result.message);
      await loadRecipes(offset, search);
    } catch (err) {
      console.error("[Recipes] bulk publish failed:", err);
      toast.error("Bulk publish failed — check server logs");
    } finally {
      setPublishing(false);
    }
  }

  const draftCount = recipes.filter((r) => r.status === "draft").length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (loading) {
    return <SkeletonRecipeList />;
  }

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recipes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} recipe{total !== 1 ? "s" : ""} total
            {draftCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {draftCount} draft{draftCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        {draftCount > 0 && (
          <button
            onClick={handleBulkPublish}
            disabled={publishing}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {publishing ? "Publishing..." : `Publish All Drafts (${draftCount})`}
          </button>
        )}
      </div>

      {/* Draft warning banner */}
      {draftCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {draftCount} recipe{draftCount !== 1 ? "s" : ""} ready to publish
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              These recipes are saved but won&apos;t appear on your live site until published. Click{" "}
              <span className="font-medium">Publish All Drafts</span> above to push them live.
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, keyword, or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {recipes.length === 0 ? (
          <EmptyState hasSearch={!!search.trim()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Keyword
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Word Count
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() =>
                      (window.location.href = `/projects/${id}/recipes/${recipe.id}`)
                    }
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-brand-600 hover:text-brand-700">
                      {recipe.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {recipe.keyword}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={recipe.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {recipe.word_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {formatDate(recipe.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages} &mdash; {total} recipes total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(offset - PAGE_SIZE)}
                disabled={offset === 0 || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => goToPage(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "published"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        {hasSearch ? (
          <Search className="h-8 w-8 text-brand-500" />
        ) : (
          <BookOpen className="h-8 w-8 text-brand-500" />
        )}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-slate-900">
        {hasSearch ? "No matching recipes" : "No recipes yet"}
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
        {hasSearch
          ? "Try a different search term or clear the filter."
          : "Recipes will appear here once content generation runs."}
      </p>
    </div>
  );
}
