"use client";

import { useEffect, useState, useCallback } from "react";
import { Project } from "@/lib/types";
import { api, ApiError } from "@/lib/api-client";
import ProjectCard from "@/components/dashboard/ProjectCard";
import EmptyState from "@/components/dashboard/EmptyState";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      if (!Array.isArray(data)) {
        console.error("[Dashboard] Expected array, got:", typeof data);
        setProjects([]);
        return;
      }
      setProjects(data);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Failed to load projects (${err.status})`
        : "Network error — could not reach server";
      toast.error(msg);
      console.error("[Dashboard] fetchProjects failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleToggleStatus(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newStatus = project.status === "active" ? "paused" : "active";
    try {
      await api.put(`/api/projects/${id}`, { status: newStatus });
      fetchProjects();
    } catch (err) {
      toast.error(`Failed to ${newStatus === "active" ? "activate" : "pause"} project`);
      console.error("[Dashboard] toggleStatus failed:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      toast.error("Failed to delete project");
      console.error("[Dashboard] delete failed:", err);
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.niche.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = projects.filter((p) => p.status === "active").length;
  const totalRecipes = projects.reduce((s, p) => s + p.recipes_published, 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Projects</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {projects.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active Sites</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Recipes Published</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {totalRecipes}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
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
