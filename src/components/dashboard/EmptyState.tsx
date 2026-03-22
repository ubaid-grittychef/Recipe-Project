"use client";

import Link from "next/link";
import { PlusCircle, ChefHat } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-8 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <ChefHat className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">
        No projects yet
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Create your first recipe website project. Each one becomes an
        independent SEO asset that generates content and earns on autopilot.
      </p>
      <Link
        href="/projects/new"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        <PlusCircle className="h-4 w-4" />
        Create First Project
      </Link>
    </div>
  );
}
