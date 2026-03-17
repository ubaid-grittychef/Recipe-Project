"use client";

import { useState, useCallback } from "react";
import { Project } from "@/lib/types";
import { api } from "@/lib/api-client";
import ProjectCard from "@/components/dashboard/ProjectCard";
import EmptyState from "@/components/dashboard/EmptyState";
import { PlusCircle, Search, Pause, Play, Trash2, CheckSquare, X, LayoutDashboard, TrendingUp, BookOpen, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";

interface Props {
  initialProjects: Project[];
}

export default function DashboardClient({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "setup">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      if (Array.isArray(data)) setProjects(data);
    } catch {
      toast.error("Failed to refresh projects");
    }
  }, []);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.niche.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  // Bulk operations
  async function bulkAction(action: "pause" | "resume" | "delete") {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${ids.length} project${ids.length !== 1 ? "s" : ""}?`,
        description: "All recipes, keywords, and deployment history will be permanently deleted. This cannot be undone.",
        confirmLabel: `Delete ${ids.length} project${ids.length !== 1 ? "s" : ""}`,
        danger: true,
      });
      if (!ok) return;
    }

    setBulkLoading(true);
    try {
      const result = await api.post<{ updated: number; message: string }>("/api/projects/bulk", {
        ids,
        action,
      });
      toast.success(result.message);
      clearSelection();
      await fetchProjects();
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleToggleStatus(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newStatus = project.status === "active" ? "paused" : "active";
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    try {
      const updated = await api.put<Project>(`/api/projects/${id}`, { status: newStatus });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: project.status } : p)));
      toast.error(`Failed to ${newStatus === "active" ? "activate" : "pause"} project`);
    }
  }

  async function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id);
    const ok = await confirm({
      title: `Delete "${project?.name ?? "this project"}"?`,
      description: "All recipes, keywords, and deployment history will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (!ok) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.delete(`/api/projects/${id}`);
      toast.success("Project deleted");
    } catch {
      fetchProjects();
      toast.error("Failed to delete project");
    }
  }

  async function handleCopy(id: string) {
    try {
      await api.post(`/api/projects/${id}/copy`);
      toast.success("Project duplicated");
      fetchProjects();
    } catch {
      toast.error("Failed to duplicate project");
    }
  }

  const activeCount = projects.filter((p) => p.status === "active").length;
  const totalRecipes = projects.reduce((s, p) => s + p.recipes_published, 0);
  const liveCount = projects.filter((p) => p.deployment_status === "deployed").length;
  const totalPendingKeywords = projects.reduce((s, p) => s + p.keywords_remaining, 0);

  if (projects.length === 0) {
    return <EmptyState />;
  }

  const hasSelection = selectedIds.size > 0;

  return (
    <div>
      {ConfirmDialog}

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={projects.length}
          icon={<LayoutDashboard className="h-5 w-5" />}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          borderColor="border-l-slate-400"
        />
        <StatCard
          label="Active Sites"
          value={activeCount}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          borderColor="border-l-emerald-500"
          badge={{ label: `${liveCount} live`, color: "bg-emerald-100 text-emerald-700" }}
        />
        <StatCard
          label="Recipes Published"
          value={totalRecipes.toLocaleString()}
          icon={<BookOpen className="h-5 w-5" />}
          iconBg="bg-orange-50"
          iconColor="text-brand-600"
          borderColor="border-l-brand-500"
        />
        <StatCard
          label="Pending Keywords"
          value={totalPendingKeywords.toLocaleString()}
          icon={<KeyRound className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-l-blue-500"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 shadow-sm"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-1">
            {(["all", "active", "paused", "setup"] as const).map((f) => {
              const count = f === "all" ? projects.length : projects.filter((p) => p.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    filter === f
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {f === "all" ? `All (${count})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${count})`}
                </button>
              );
            })}
          </div>

          <button
            onClick={allSelected ? clearSelection : selectAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{allSelected ? "Deselect all" : "Select all"}</span>
          </button>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Bulk action bar — shown when any project is selected */}
      {hasSelection && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3">
          <span className="text-sm font-medium text-brand-900">
            {selectedIds.size} project{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-1 items-center gap-2">
            <button
              onClick={() => bulkAction("resume")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Activate
            </button>
            <button
              onClick={() => bulkAction("pause")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
            <button
              onClick={() => bulkAction("delete")}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onCopy={handleCopy}
            isSelected={selectedIds.has(project.id)}
            onSelect={toggleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          No projects match &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  borderColor,
  badge,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  badge?: { label: string; color: string };
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-card border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 leading-none">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      {badge && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      )}
    </div>
  );
}
