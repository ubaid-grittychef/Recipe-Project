import { getCategories, getProject } from "@/lib/store";
import { Tag, BookOpen } from "lucide-react";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CategoriesPage({ params }: Props) {
  const { id } = await params;
  const [categories, project] = await Promise.all([getCategories(id), getProject(id)]);
  const totalRecipes = categories.reduce((sum, c) => sum + c.recipe_count, 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "All Projects", href: "/" },
        { label: project?.name ?? "Project", href: `/projects/${id}` },
        { label: "Categories" },
      ]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Tag className="h-6 w-6 text-brand-500" />
            Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-created from AI-generated recipe categories.{" "}
            {totalRecipes > 0 && `${totalRecipes} recipes across ${categories.length} categories.`}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Categories are created automatically when recipes are generated."
        />
      ) : (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {true ? (
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
                    href={`/projects/${id}/recipes?category=${encodeURIComponent(cat.name)}`}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    View Recipes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}
