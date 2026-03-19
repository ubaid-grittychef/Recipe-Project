"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  BookOpen,
  ChefHat,
  X,
  LogOut,
  ArrowLeft,
  BarChart3,
  Activity,
  Rocket,
  ListChecks,
  UtensilsCrossed,
  Tags,
  FileText,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigation = [
  { name: "All Projects", href: "/", icon: LayoutDashboard },
  { name: "New Project", href: "/projects/new", icon: PlusCircle },
  { name: "Setup Guide", href: "/guide", icon: BookOpen },
  { name: "System Config", href: "/settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  userRole: string;
  userEmail: string;
  userFullName: string;
}

export default function Sidebar({ mobileOpen, onClose, userRole, userEmail, userFullName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const isProjectPage = !!projectId && projectId !== "new";

  const projectNav = projectId ? [
    { name: "Overview", href: `/projects/${projectId}`, icon: LayoutDashboard, exact: true },
    { name: "Recipes", href: `/projects/${projectId}/recipes`, icon: FileText, exact: false },
    { name: "Queue", href: `/projects/${projectId}/queue`, icon: ListChecks, exact: false },
    { name: "Analytics", href: `/projects/${projectId}/analytics`, icon: BarChart3, exact: false },
    { name: "Restaurants", href: `/projects/${projectId}/restaurants`, icon: UtensilsCrossed, exact: false },
    { name: "Categories", href: `/projects/${projectId}/categories`, icon: Tags, exact: false },
    { name: "Logs", href: `/projects/${projectId}/logs`, icon: Activity, exact: false },
    { name: "Deploy", href: `/projects/${projectId}/deploy`, icon: Rocket, exact: false },
    { name: "Settings", href: `/projects/${projectId}/settings`, icon: Settings, exact: false },
  ] : [];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const avatarLetter = (userFullName || userEmail || "U").charAt(0).toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shadow-sm">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Recipe Factory</p>
            <p className="text-[10px] text-slate-400 font-medium">SEO Site Builder</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Global nav */}
        <div>
          <p className="section-title px-3 mb-2">Main Menu</p>
          <div className="space-y-0.5">
            {navigation.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn("sidebar-link", isActive && "active")}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Project nav */}
        {isProjectPage && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="section-title">Project</p>
              <Link
                href="/"
                onClick={onClose}
                className="text-[10px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </Link>
            </div>
            <div className="space-y-0.5">
              {projectNav.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn("sidebar-link py-2", isActive && "active")}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin section — only shown to admins */}
        {userRole === "admin" && (
          <div>
            <p className="section-title px-3 mb-2">Admin</p>
            <div className="space-y-0.5">
              <Link
                href="/admin/users"
                onClick={onClose}
                className={cn("sidebar-link", pathname.startsWith("/admin") && "active")}
              >
                <Users className="h-4 w-4 shrink-0" />
                Manage Users
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Legal footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-400 space-x-3 px-4 pb-4">
        <a href="/terms" className="hover:text-slate-600">Terms</a>
        <a href="/privacy" className="hover:text-slate-600">Privacy</a>
      </div>

      {/* Footer — user profile + sign out */}
      <div className="border-t border-slate-100 p-3 space-y-1.5">
        {/* User profile card */}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 shrink-0">
            <span className="text-xs font-bold text-brand-600">{avatarLetter}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">
              {userFullName || "My Account"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
          </div>
          {userRole === "admin" && (
            <div className="flex items-center gap-1 shrink-0">
              <Shield className="h-3 w-3 text-purple-500" />
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 uppercase tracking-wide">
                Admin
              </span>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
