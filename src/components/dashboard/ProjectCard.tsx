"use client";

import Link from "next/link";
import {
  Globe,
  BookOpen,
  KeyRound,
  Clock,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

const statusConfig = {
  active: { label: "Active", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  paused: { label: "Paused", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  setup: { label: "Setup", dot: "bg-slate-300", badge: "bg-secondary text-muted-foreground ring-1 ring-slate-200" },
};

const deployConfig = {
  deployed: { label: "Live", color: "text-emerald-600", icon: CheckCircle2 },
  deploying: { label: "Deploying…", color: "text-blue-500", icon: Rocket },
  failed: { label: "Failed", color: "text-red-500", icon: AlertTriangle },
  pending: { label: "Not deployed", color: "text-muted-foreground", icon: Globe },
};

interface ProjectCardProps {
  project: Project;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function ProjectCard({
  project,
  onToggleStatus,
  onDelete,
  onCopy,
  isSelected = false,
  onSelect,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = statusConfig[project.status];
  const deploy = deployConfig[project.deployment_status as keyof typeof deployConfig] ?? deployConfig.pending;
  const DeployIcon = deploy.icon;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const successRate =
    project.recipes_published + project.keywords_failed > 0
      ? Math.round((project.recipes_published / (project.recipes_published + project.keywords_failed)) * 100)
      : null;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-xl border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 overflow-hidden",
      isSelected ? "border-primary ring-2 ring-ring/20" : "border-border"
    )}>
      {/* Top accent bar */}
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: project.primary_color || "#f97316" }}
      />

      <div className="flex flex-1 flex-col p-5">
        {/* Checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(project.id)}
            className="absolute left-4 top-5 z-10"
            aria-label={isSelected ? "Deselect" : "Select"}
          >
            <div className={cn(
              "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
              isSelected ? "border-brand-500 bg-brand-500" : "border-slate-300 bg-card hover:border-primary"
            )}>
              {isSelected && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        )}

        {/* Header row */}
        <div className={cn("flex items-start justify-between gap-2", onSelect && "pl-6")}>
          <div className="flex items-center gap-3 min-w-0">
            {project.logo_url ? (
              <img
                src={project.logo_url}
                alt={project.name}
                className="h-10 w-10 shrink-0 rounded-lg object-contain border border-border/50 bg-card p-0.5"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold shadow-sm"
                style={{ backgroundColor: project.primary_color || "#f97316" }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="block truncate text-sm font-bold text-foreground hover:text-brand-600 transition-colors"
              >
                {project.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground mt-0.5">{project.niche}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Status badge */}
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", status.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>

            {/* Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-card py-1 shadow-lg ring-1 ring-black/5">
                  <button
                    onClick={() => { onToggleStatus(project.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    {project.status === "active" ? <Pause className="h-4 w-4 text-muted-foreground" /> : <Play className="h-4 w-4 text-muted-foreground" />}
                    {project.status === "active" ? "Pause project" : "Activate project"}
                  </button>
                  {onCopy && (
                    <button
                      onClick={() => { onCopy(project.id); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                      Duplicate
                    </button>
                  )}
                  <div className="my-1 border-t border-border/50" />
                  <button
                    onClick={() => { onDelete(project.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{project.recipes_published}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Recipes</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{project.keywords_remaining}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Pending</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
            <p className={cn("text-lg font-bold", successRate !== null ? "text-foreground" : "text-slate-300")}>
              {successRate !== null ? `${successRate}%` : "—"}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">Success</p>
          </div>
        </div>

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {project.template_variant === "premium" && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
              Premium
            </span>
          )}
          {(project.draft_count ?? 0) > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              {project.draft_count} draft
            </span>
          )}
          {project.keywords_failed > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
              <AlertTriangle className="h-3 w-3" />
              {project.keywords_failed} failed
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 bg-muted/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <DeployIcon className={cn("h-3.5 w-3.5 shrink-0", deploy.color)} />
          <span className={cn("truncate", deploy.color, "font-medium")}>
            {project.deployment_status === "deployed"
              ? (project.domain || "Live")
              : deploy.label}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(project.last_generation_at)}
          </span>
          <Link
            href={`/projects/${project.id}`}
            className="flex items-center gap-0.5 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
          >
            Manage
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
