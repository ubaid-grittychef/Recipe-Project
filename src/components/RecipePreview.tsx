"use client";

import { Recipe } from "@/lib/types";
import { Clock, Users, ChefHat, Star } from "lucide-react";

interface Props {
  recipe: Recipe;
}

export default function RecipePreview({ recipe }: Props) {
  const stars = Math.round(recipe.rating);

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Hero image */}
      {recipe.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 w-full items-center justify-center bg-secondary">
          <ChefHat className="h-16 w-16 text-slate-300" />
        </div>
      )}

      <div className="p-6 md:p-8">
        {/* Category + rating */}
        <div className="mb-3 flex items-center justify-between">
          {recipe.category && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
              {recipe.category}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            ))}
            <span className="ml-1 text-sm text-muted-foreground">({recipe.rating.toFixed(1)})</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{recipe.title}</h1>

        {/* Description */}
        <p className="mt-3 text-base text-muted-foreground">{recipe.description}</p>

        {/* Meta pills */}
        <div className="mt-5 flex flex-wrap gap-4">
          {recipe.prep_time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Prep:</span> {recipe.prep_time}
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Cook:</span> {recipe.cook_time}
            </div>
          )}
          {recipe.total_time && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total:</span> {recipe.total_time}
            </div>
          )}
          {recipe.servings > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Serves:</span> {recipe.servings}
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Difficulty:</span> {recipe.difficulty}
            </div>
          )}
        </div>

        {/* Intro */}
        {recipe.intro_content && (
          <div className="mt-6 rounded-xl bg-muted/50 p-4 text-sm text-foreground leading-relaxed">
            {recipe.intro_content}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Ingredients */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span>
                    {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Nutrition */}
          {recipe.nutrition && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Nutrition</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(recipe.nutrition)
                  .filter(([, v]) => v)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}:</span>{" "}
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {recipe.instructions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-4 text-sm text-foreground">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="mt-1 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tips */}
        {recipe.tips.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Tips & Tricks</h2>
            <ul className="space-y-2">
              {recipe.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1 text-brand-500">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Variations */}
        {recipe.variations.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Variations</h2>
            <ul className="space-y-2">
              {recipe.variations.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1 text-muted-foreground">→</span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQs */}
        {recipe.faqs.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">FAQs</h2>
            <div className="space-y-4">
              {recipe.faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-muted/50 p-4">
                  <p className="text-sm font-semibold text-foreground">{faq.question}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEO footer (visible in preview only) */}
        <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO metadata (preview only)</p>
          <p className="mt-2 text-sm font-medium text-foreground">{recipe.seo_title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{recipe.seo_description}</p>
          {recipe.focus_keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {recipe.focus_keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
