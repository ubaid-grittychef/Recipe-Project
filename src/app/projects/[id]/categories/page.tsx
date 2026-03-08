"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Tag, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { Category } from "@/lib/types";

export default function CategoriesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/categories`);
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const totalRecipes = categories.reduce((sum, c) => sum + c.recipe_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Tag className="h-6 w-6 text-brand-500" />
            Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-created from AI-generated recipe categories. {totalRecipes > 0 && `${totalRecipes} recipes across ${categories.length} categories.`}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No categories yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Categories are created automatically when recipes are generated.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <Tag className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-400">/{cat.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <BookOpen className="h-4 w-4" />
                    {cat.recipe_count} recipe{cat.recipe_count !== 1 ? "s" : ""}
                  </span>
                  <Link
                    href={`/projects/${projectId}/recipes?category=${encodeURIComponent(cat.name)}`}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    View Recipes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
