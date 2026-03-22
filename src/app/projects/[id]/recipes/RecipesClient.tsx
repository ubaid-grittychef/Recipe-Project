"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Recipe } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  BookOpen,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  ListChecks,
  Zap,
  Link2,
  RefreshCw,
  Trash2,
  Download,
  CheckSquare,
  X,
} from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const PAGE_SIZE = 50;

interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface Props {
  id: string;
  projectName: string;
  initialRecipes: Recipe[];
  initialTotal: number;
}

export default function RecipesClient({ id, projectName, initialRecipes, initialTotal }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [sort, setSort] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  const allSelected = recipes.length > 0 && recipes.every((r) => selectedIds.has(r.id));

  function toggleSelect(recipeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(recipes.map((r) => r.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const loadRecipes = useCallback(
    (currentOffset: number, searchQuery: string, sortField = sort, direction = sortDir, status = statusFilter) => {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
        sort: sortField,
        sortDir: direction,
      });
      if (searchQuery) qs.set("search", searchQuery);
      if (status) qs.set("status", status);
      return api
        .get<RecipesResponse>(`/api/projects/${id}/recipes?${qs.toString()}`)
        .then((data) => {
          setRecipes(data.recipes ?? []);
          setTotal(data.total ?? 0);
          setSelectedIds(new Set()); // clear selection on reload
        })
        .catch(() => {
          toast.error("Failed to load recipes");
        });
    },
    [id, sort, sortDir, statusFilter]
  );

  // Debounced search
  useEffect(() => {
    if (search === "" && offset === 0 && sort === "created_at" && sortDir === "desc" && statusFilter === "") {
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      setOffset(0);
      loadRecipes(0, search).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function goToPage(newOffset: number) {
    setLoading(true);
    setOffset(newOffset);
    await loadRecipes(newOffset, search);
    setLoading(false);
  }

  async function applyFilter(params: { sort?: string; sortDir?: string; status?: string }) {
    const nextSort = params.sort ?? sort;
    const nextDir = params.sortDir ?? sortDir;
    const nextStatus = params.status !== undefined ? params.status : statusFilter;
    if (params.sort) setSort(nextSort);
    if (params.sortDir) setSortDir(nextDir);
    if (params.status !== undefined) setStatusFilter(nextStatus);
    setLoading(true);
    setOffset(0);
    await loadRecipes(0, search, nextSort, nextDir, nextStatus);
    setLoading(false);
  }

  async function handleRefreshAll() {
    if (draftCount === 0) { toast.info("No draft recipes to refresh"); return; }
    setRefreshingAll(true);
    try {
      const result = await api.post<{ refreshed: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/refresh-all`,
        { status: "draft" }
      );
      toast.success(result.message);
      await loadRecipes(offset, search);
    } catch {
      toast.error("Refresh failed — check server logs");
    } finally {
      setRefreshingAll(false);
    }
  }

  async function handleRelink() {
    setRelinking(true);
    try {
      const result = await api.post<{ updated: number; total: number; message: string }>(
        `/api/projects/${id}/recipes/relink`
      );
      toast.success(result.message);
    } catch {
      toast.error("Relink failed — check server logs");
    } finally {
      setRelinking(false);
    }
  }

  async function handleBulkPublish() {
    const draftCount = recipes.filter((r) => r.status === "draft").length;
    if (draftCount === 0) { toast.info("No draft recipes to publish"); return; }
    setPublishing(true);
    try {
      const result = await api.post<{ published: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-publish`
      );
      toast.success(result.message);
      await loadRecipes(offset, search);
    } catch {
      toast.error("Bulk publish failed — check server logs");
    } finally {
      setPublishing(false);
    }
  }

  async function handlePublishSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkPublishing(true);
    try {
      const result = await api.post<{ published: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-publish`,
        { recipeIds: ids }
      );
      toast.success(result.message);
      await loadRecipes(offset, search);
    } catch {
      toast.error("Publish failed — check server logs");
    } finally {
      setBulkPublishing(false);
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} recipe${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const result = await api.delete<{ deleted: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-delete`,
        { ids }
      );
      toast.success(result.message);
      await loadRecipes(offset, search);
    } catch {
      toast.error("Delete failed — check server logs");
    } finally {
      setBulkDeleting(false);
    }
  }

  function handleExportCSV() {
    const selected = recipes.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;
    const headers = ["title", "keyword", "category", "status", "word_count", "created_at", "published_at"];
    const rows = selected.map((r) => [
      `"${(r.title ?? "").replace(/"/g, '""')}"`,
      `"${(r.keyword ?? "").replace(/"/g, '""')}"`,
      `"${(r.category ?? "").replace(/"/g, '""')}"`,
      r.status,
      String(r.word_count ?? 0),
      r.created_at ?? "",
      r.published_at ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recipes-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} recipes`);
  }

  const draftCount = recipes.filter((r) => r.status === "draft").length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <Breadcrumbs items={[
        { label: "All Projects", href: "/" },
        { label: projectName, href: `/projects/${id}` },
        { label: "Recipes" },
      ]} />

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} recipe{total !== 1 ? "s" : ""} total
            {draftCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {draftCount} draft{draftCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              onClick={handleRelink}
              disabled={relinking}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
              title="Inject internal links between published recipes"
            >
              {relinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {relinking ? "Relinking..." : "Relink"}
            </button>
          )}
          {draftCount > 0 && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:opacity-50"
            >
              {refreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {refreshingAll ? "Refreshing..." : `AI Refresh Drafts (${draftCount})`}
            </button>
          )}
          {draftCount > 0 && (
            <button
              onClick={handleBulkPublish}
              disabled={publishing}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {publishing ? "Publishing..." : `Publish All Drafts (${draftCount})`}
            </button>
          )}
        </div>
      </div>

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

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, keyword, or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => applyFilter({ status: e.target.value })}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft only</option>
          <option value="published">Published only</option>
        </select>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => applyFilter({ sort: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none"
          >
            <option value="created_at">Date created</option>
            <option value="published_at">Date published</option>
            <option value="word_count">Word count</option>
          </select>
          <button
            onClick={() => applyFilter({ sortDir: sortDir === "desc" ? "asc" : "desc" })}
            className="rounded-lg border border-border bg-card px-2.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            title={sortDir === "desc" ? "Descending — click for ascending" : "Ascending — click for descending"}
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {/* Bulk selection action banner */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="mr-1 text-sm font-semibold text-brand-700">
            {selectedIds.size} recipe{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handlePublishSelected}
            disabled={bulkPublishing}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {bulkPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Publish Selected
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Delete Selected
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState hasSearch={!!search.trim()} projectId={id} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  {/* Select-all checkbox */}
                  <th className="w-10 px-4 py-4">
                    <button
                      onClick={allSelected ? clearSelection : selectAll}
                      className="flex items-center justify-center text-muted-foreground hover:text-brand-500"
                      title={allSelected ? "Deselect all" : "Select all on this page"}
                    >
                      <CheckSquare className={cn("h-4 w-4", allSelected && "text-brand-500")} />
                    </button>
                  </th>
                  {["Title", "Keyword", "Category", "Status", "Words", "Date", ""].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
                        h === "Category" && "hidden md:table-cell",
                        h === "Words" && "hidden sm:table-cell"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      selectedIds.has(recipe.id) && "bg-brand-50 hover:bg-brand-50"
                    )}
                    onClick={() => (window.location.href = `/projects/${id}/recipes/${recipe.id}`)}
                  >
                    {/* Row checkbox */}
                    <td
                      className="w-10 px-4 py-4"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(recipe.id); }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(recipe.id)}
                        onChange={() => toggleSelect(recipe.id)}
                        className="h-4 w-4 rounded border-border accent-brand-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-brand-600 hover:text-brand-700">
                      {recipe.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">{recipe.keyword}</td>
                    <td className="hidden whitespace-nowrap px-4 py-4 md:table-cell">
                      {recipe.category ? (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {recipe.category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        recipe.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {recipe.status}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-muted-foreground sm:table-cell">
                      {recipe.word_count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                      {formatDate(recipe.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link
                        href={`/projects/${id}/recipes/${recipe.id}/preview`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Preview recipe"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} &mdash; {total} recipes total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(offset - PAGE_SIZE)}
                disabled={offset === 0 || loading}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => goToPage(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-40"
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

function EmptyState({ hasSearch, projectId }: { hasSearch: boolean; projectId: string }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-foreground">No matching recipes</h3>
        <p className="mt-2 text-sm text-muted-foreground">Try a different search term or clear the filter.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <BookOpen className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">No recipes yet</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Recipes are generated from your keywords. Add keywords, then run generation from the project dashboard.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/projects/${projectId}/queue`}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <ListChecks className="h-4 w-4" />
          Add Keywords
        </Link>
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Zap className="h-4 w-4" />
          Generate Now
        </Link>
      </div>
    </div>
  );
}
