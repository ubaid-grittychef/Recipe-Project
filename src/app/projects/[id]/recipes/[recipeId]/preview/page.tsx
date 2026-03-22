"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock, Users, ChefHat, Star, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ id: string; recipeId: string }>;
}

export default function RecipePreviewPage({ params }: Props) {
  const { id, recipeId } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Recipe>(`/api/projects/${id}/recipes/${recipeId}`)
      .then(setRecipe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, recipeId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Link href={`/projects/${id}/recipes`} className="mt-2 text-brand-500 hover:text-brand-600">
          Back to Recipes
        </Link>
      </div>
    );
  }

  // Parse intro_content — **Heading** becomes a bold h3
  function renderIntro(text: string) {
    const lines = text.split("\n").filter(Boolean);
    return lines.map((line, i) => {
      const headingMatch = line.match(/^\*\*(.+?)\*\*$/);
      if (headingMatch) {
        return (
          <h3 key={i} className="mt-6 mb-2 text-xl font-semibold text-foreground">
            {headingMatch[1]}
          </h3>
        );
      }
      // Inline bold within a paragraph
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="mb-3 leading-relaxed text-foreground">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* Nav bar */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={`/projects/${id}/recipes/${recipeId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Link>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            recipe.status === "published"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          {recipe.status}
        </span>
      </div>

      {/* Hero image */}
      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="mb-8 h-72 w-full rounded-2xl object-cover"
        />
      )}

      {/* Title + meta */}
      <div className="mb-6">
        {recipe.category && (
          <span className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            {recipe.category}
          </span>
        )}
        <h1 className="text-3xl font-bold leading-tight text-foreground">{recipe.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{recipe.description}</p>

        {/* Rating */}
        <div className="mt-4 flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < Math.round(recipe.rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200"
              )}
            />
          ))}
          <span className="ml-1 text-sm font-medium text-foreground">{recipe.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip icon={Clock} label="Prep" value={recipe.prep_time} />
        <StatChip icon={Clock} label="Cook" value={recipe.cook_time} />
        <StatChip icon={Clock} label="Total" value={recipe.total_time} />
        <StatChip icon={Users} label="Serves" value={String(recipe.servings)} />
      </div>

      {/* Difficulty */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <ChefHat className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Difficulty:</span>
        <span className={cn(
          "font-medium",
          recipe.difficulty === "Easy" ? "text-emerald-600" :
          recipe.difficulty === "Hard" ? "text-red-600" : "text-amber-600"
        )}>
          {recipe.difficulty}
        </span>
      </div>

      {/* Intro article */}
      {recipe.intro_content && (
        <div className="mb-10 rounded-xl border border-border/50 bg-muted/50 p-6">
          {renderIntro(recipe.intro_content)}
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span className="text-foreground">
                {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Nutrition */}
      {recipe.nutrition && (
        <div className="mb-10 rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nutrition per serving
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: "Calories", value: recipe.nutrition.calories },
              { label: "Protein", value: recipe.nutrition.protein },
              { label: "Carbs", value: recipe.nutrition.carbs },
              { label: "Fat", value: recipe.nutrition.fat },
              { label: "Fiber", value: recipe.nutrition.fiber },
              { label: "Sodium", value: recipe.nutrition.sodium },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Instructions</h2>
        <ol className="space-y-4">
          {recipe.instructions.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-0.5 leading-relaxed text-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      {recipe.tips.length > 0 && (
        <div className="mb-10 rounded-xl border border-amber-100 bg-amber-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-amber-900">Pro Tips</h2>
          <ul className="space-y-2">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0 text-amber-400">✦</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Variations */}
      {recipe.variations.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Variations</h2>
          <ul className="space-y-2">
            {recipe.variations.map((v, i) => (
              <li key={i} className="flex gap-2 text-foreground">
                <span className="text-brand-400">→</span>
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FAQs */}
      {recipe.faqs.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {recipe.faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
                <p className="font-semibold text-foreground">{faq.question}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO meta preview */}
      <div className="rounded-xl border border-border bg-muted/50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          SEO Preview
        </h3>
        <p className="text-sm font-medium text-blue-600">{recipe.seo_title || recipe.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{recipe.seo_description || recipe.description?.slice(0, 155)}</p>
        {recipe.focus_keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.focus_keywords.map((kw, i) => (
              <span key={i} className="rounded-full bg-card border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card p-4 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value || "—"}</span>
    </div>
  );
}
