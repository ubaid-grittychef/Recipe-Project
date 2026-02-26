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
} from "lucide-react";
import { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  setup: { label: "Setup", color: "bg-slate-100 text-slate-600" },
};

interface ProjectCardProps {
  project: Project;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({
  project,
  onToggleStatus,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = statusConfig[project.status];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ backgroundColor: project.primary_color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link
              href={`/projects/${project.id}`}
              className="text-base font-semibold text-slate-900 hover:text-brand-600"
            >
              {project.name}
            </Link>
            <p className="text-sm text-slate-500">{project.niche}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.color
            )}
          >
            {status.label}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    onToggleStatus(project.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {project.status === "active" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {project.status === "active" ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    onDelete(project.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-700">
            {project.recipes_published}
          </span>
          <span className="text-slate-400">recipes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-700">
            {project.keywords_remaining}
          </span>
          <span className="text-slate-400">keywords</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="truncate text-slate-500">
            {project.domain || "No domain"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          Last run: {formatDate(project.last_generation_at)}
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="text-xs font-medium text-brand-500 hover:text-brand-600"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}
