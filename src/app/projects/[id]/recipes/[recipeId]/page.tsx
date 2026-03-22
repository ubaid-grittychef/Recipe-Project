"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Recipe } from "@/lib/types";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";
import {
  ArrowLeft,
  Save,
  Loader2,
  Eye,
  Trash2,
  Plus,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { SkeletonRecipeEditor } from "@/components/Skeleton";
import RecipePreview from "@/components/RecipePreview";

interface Props {
  params: Promise<{ id: string; recipeId: string }>;
}

export default function RecipeEditorPage({ params }: Props) {
  const { id, recipeId } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [savedRecipe, setSavedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [confirm, ConfirmDialog] = useConfirm();
  // Track whether there are unsaved changes
  const isDirty = recipe !== null && savedRecipe !== null &&
    JSON.stringify(recipe) !== JSON.stringify(savedRecipe);
  // Block browser-level navigation (refresh / close tab) when dirty
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    api
      .get<Recipe>(`/api/projects/${id}/recipes/${recipeId}`)
      .then((data) => {
        setRecipe(data);
        setSavedRecipe(data);
      })
      .catch(() => {
        toast.error("Failed to load recipe");
      })
      .finally(() => setLoading(false));
  }, [id, recipeId]);

  function update(fields: Partial<Recipe>) {
    setRecipe((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  async function handleSave(publish?: boolean) {
    if (!recipe) return;
    setSaving(true);
    try {
      const payload = { ...recipe };
      if (publish !== undefined) {
        payload.status = publish ? "published" : "draft";
        if (publish && !payload.published_at) {
          payload.published_at = new Date().toISOString();
        }
      }
      const updated = await api.put<Recipe>(
        `/api/projects/${id}/recipes/${recipeId}`,
        payload
      );
      setRecipe(updated);
      setSavedRecipe(updated);
      toast.success(publish ? "Recipe published!" : "Recipe saved");
    } catch {
      toast.error("Failed to save recipe");
    } finally {
      setSaving(false);
    }
  }

  async function handleNavigateBack() {
    if (isDirty) {
      const ok = await confirm({
        title: "Unsaved changes",
        description: "You have unsaved changes that will be lost. Leave anyway?",
        confirmLabel: "Leave without saving",
        cancelLabel: "Stay and save",
        danger: true,
      });
      if (!ok) return;
    }
    router.push(`/projects/${id}/recipes`);
  }

  async function handleRefresh() {
    const ok = await confirm({
      title: "Refresh AI content?",
      description: "This will regenerate the intro text and SEO fields using fresh AI output. Your current edits will be replaced.",
      confirmLabel: "Refresh content",
      danger: false,
    });
    if (!ok) return;
    setRefreshing(true);
    try {
      const result = await api.post<{ recipe: Recipe }>(`/api/projects/${id}/recipes/${recipeId}/refresh`);
      setRecipe(result.recipe);
      setSavedRecipe(result.recipe);
      toast.success("Content refreshed with fresh AI output");
    } catch {
      toast.error("Refresh failed — check OpenAI configuration");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete recipe permanently?",
      description: "This action cannot be undone. The recipe will be removed from both the factory and your live site.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/projects/${id}/recipes/${recipeId}`);
      toast.success("Recipe deleted");
      router.push(`/projects/${id}/recipes`);
    } catch {
      toast.error("Failed to delete recipe");
    }
  }

  if (loading) {
    return <SkeletonRecipeEditor />;
  }

  if (!recipe) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Link
          href={`/projects/${id}/recipes`}
          className="mt-2 text-brand-500 hover:text-brand-600"
        >
          Back to Recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {ConfirmDialog}
      <button
        onClick={handleNavigateBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Recipes
      </button>

      {/* Header with save actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Recipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status:{" "}
            <span
              className={
                recipe.status === "published"
                  ? "font-medium text-emerald-600"
                  : "font-medium text-amber-600"
              }
            >
              {recipe.status}
            </span>
            {isDirty && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Unsaved changes
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => setActiveTab("edit")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "edit"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || saving}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
            title="Regenerate intro content and SEO fields with AI"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "AI Refresh"}
          </button>
          {recipe.status === "draft" && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Publish
            </button>
          )}
          {recipe.status === "published" && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              Unpublish
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100"
            title="Delete recipe"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeTab === "preview" && (
        <RecipePreview recipe={recipe} />
      )}

      {activeTab === "edit" && <div className="space-y-6">
        {/* Title & SEO */}
        <Section title="Title & SEO">
          <Field label="Title (H1)">
            <input
              type="text"
              value={recipe.title}
              onChange={(e) => update({ title: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Slug">
            <input
              type="text"
              value={recipe.slug}
              onChange={(e) => update({ slug: e.target.value })}
              className="input-field font-mono text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SEO Title (60 chars)">
              <input
                type="text"
                value={recipe.seo_title}
                onChange={(e) => update({ seo_title: e.target.value })}
                maxLength={70}
                className="input-field"
              />
              <CharCount value={recipe.seo_title} max={60} />
            </Field>
            <Field label="SEO Description (155 chars)">
              <textarea
                value={recipe.seo_description}
                onChange={(e) => update({ seo_description: e.target.value })}
                maxLength={165}
                rows={2}
                className="input-field"
              />
              <CharCount value={recipe.seo_description} max={155} />
            </Field>
          </div>
          <Field label="Focus Keywords">
            <input
              type="text"
              value={recipe.focus_keywords?.join(", ") ?? ""}
              onChange={(e) =>
                update({
                  focus_keywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              placeholder="keyword1, keyword2, keyword3"
              className="input-field"
            />
          </Field>
        </Section>

        {/* Description & Intro */}
        <Section title="Content">
          <Field label="Short Description">
            <textarea
              value={recipe.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              className="input-field"
            />
          </Field>
          <Field label="Intro Content (blog article before recipe)">
            <textarea
              value={recipe.intro_content}
              onChange={(e) => update({ intro_content: e.target.value })}
              rows={10}
              className="input-field font-mono text-sm"
              placeholder="Use **Bold Text** for subheadings..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {recipe.intro_content?.split(/\s+/).filter(Boolean).length ?? 0}{" "}
              words — Use **double asterisks** for subheadings
            </p>
          </Field>
        </Section>

        {/* Image */}
        <Section title="Image">
          <Field label="Image URL">
            <input
              type="text"
              value={recipe.image_url ?? ""}
              onChange={(e) =>
                update({ image_url: e.target.value || null })
              }
              placeholder="https://images.pexels.com/..."
              className="input-field"
            />
          </Field>
          {recipe.image_url && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="h-48 w-full object-cover"
              />
            </div>
          )}
          <Field label="Image Search Term">
            <input
              type="text"
              value={recipe.image_search_term}
              onChange={(e) =>
                update({ image_search_term: e.target.value })
              }
              className="input-field"
            />
          </Field>
        </Section>

        {/* Times & Servings */}
        <Section title="Times & Servings">
          <div className="grid grid-cols-4 gap-4">
            <Field label="Prep Time">
              <input
                type="text"
                value={recipe.prep_time}
                onChange={(e) => update({ prep_time: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Cook Time">
              <input
                type="text"
                value={recipe.cook_time}
                onChange={(e) => update({ cook_time: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Total Time">
              <input
                type="text"
                value={recipe.total_time}
                onChange={(e) => update({ total_time: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Servings">
              <input
                type="number"
                value={recipe.servings}
                onChange={(e) =>
                  update({ servings: parseInt(e.target.value) || 4 })
                }
                className="input-field"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Difficulty">
              <select
                value={recipe.difficulty}
                onChange={(e) => update({ difficulty: e.target.value })}
                className="input-field"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </Field>
            <Field label="Rating">
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={recipe.rating}
                onChange={(e) =>
                  update({ rating: parseFloat(e.target.value) || 4.8 })
                }
                className="input-field"
              />
            </Field>
          </div>
        </Section>

        {/* Ingredients */}
        <Section title="Ingredients">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={ing.quantity}
                onChange={(e) => {
                  const updated = [...recipe.ingredients];
                  updated[i] = { ...updated[i], quantity: e.target.value };
                  update({ ingredients: updated });
                }}
                placeholder="Qty"
                className="input-field w-20"
              />
              <input
                type="text"
                value={ing.unit}
                onChange={(e) => {
                  const updated = [...recipe.ingredients];
                  updated[i] = { ...updated[i], unit: e.target.value };
                  update({ ingredients: updated });
                }}
                placeholder="Unit"
                className="input-field w-20"
              />
              <input
                type="text"
                value={ing.name}
                onChange={(e) => {
                  const updated = [...recipe.ingredients];
                  updated[i] = { ...updated[i], name: e.target.value };
                  update({ ingredients: updated });
                }}
                placeholder="Ingredient name"
                className="input-field flex-1"
              />
              <button
                onClick={() => {
                  const updated = recipe.ingredients.filter((_, j) => j !== i);
                  update({ ingredients: updated });
                }}
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({
                ingredients: [
                  ...recipe.ingredients,
                  { name: "", quantity: "", unit: "" },
                ],
              })
            }
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </button>
        </Section>

        {/* Instructions */}
        <Section title="Instructions">
          {recipe.instructions.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => {
                  const updated = [...recipe.instructions];
                  updated[i] = e.target.value;
                  update({ instructions: updated });
                }}
                rows={2}
                className="input-field flex-1"
              />
              <button
                onClick={() => {
                  const updated = recipe.instructions.filter(
                    (_, j) => j !== i
                  );
                  update({ instructions: updated });
                }}
                className="mt-2 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ instructions: [...recipe.instructions, ""] })
            }
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </button>
        </Section>

        {/* Tips */}
        <Section title="Pro Tips">
          {(recipe.tips ?? []).map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                value={tip}
                onChange={(e) => {
                  const updated = [...(recipe.tips ?? [])];
                  updated[i] = e.target.value;
                  update({ tips: updated });
                }}
                rows={2}
                className="input-field flex-1"
              />
              <button
                onClick={() => {
                  const updated = (recipe.tips ?? []).filter(
                    (_, j) => j !== i
                  );
                  update({ tips: updated });
                }}
                className="mt-2 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update({ tips: [...(recipe.tips ?? []), ""] })}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-4 w-4" />
            Add Tip
          </button>
        </Section>

        {/* Variations */}
        <Section title="Variations">
          {(recipe.variations ?? []).map((v, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                value={v}
                onChange={(e) => {
                  const updated = [...(recipe.variations ?? [])];
                  updated[i] = e.target.value;
                  update({ variations: updated });
                }}
                rows={2}
                className="input-field flex-1"
              />
              <button
                onClick={() => {
                  const updated = (recipe.variations ?? []).filter(
                    (_, j) => j !== i
                  );
                  update({ variations: updated });
                }}
                className="mt-2 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ variations: [...(recipe.variations ?? []), ""] })
            }
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-4 w-4" />
            Add Variation
          </button>
        </Section>

        {/* FAQs */}
        <Section title="FAQs">
          {(recipe.faqs ?? []).map((faq, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  FAQ {i + 1}
                </span>
                <button
                  onClick={() => {
                    const updated = (recipe.faqs ?? []).filter(
                      (_, j) => j !== i
                    );
                    update({ faqs: updated });
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                value={faq.question}
                onChange={(e) => {
                  const updated = [...(recipe.faqs ?? [])];
                  updated[i] = { ...updated[i], question: e.target.value };
                  update({ faqs: updated });
                }}
                placeholder="Question"
                className="input-field"
              />
              <textarea
                value={faq.answer}
                onChange={(e) => {
                  const updated = [...(recipe.faqs ?? [])];
                  updated[i] = { ...updated[i], answer: e.target.value };
                  update({ faqs: updated });
                }}
                placeholder="Answer"
                rows={2}
                className="input-field"
              />
            </div>
          ))}
          <button
            onClick={() =>
              update({
                faqs: [
                  ...(recipe.faqs ?? []),
                  { question: "", answer: "" },
                ],
              })
            }
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        </Section>

        {/* Nutrition */}
        <Section title="Nutrition (per serving)">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Calories">
              <input
                type="number"
                value={recipe.nutrition.calories}
                onChange={(e) =>
                  update({
                    nutrition: {
                      ...recipe.nutrition,
                      calories: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="input-field"
              />
            </Field>
            <Field label="Protein">
              <input
                type="text"
                value={recipe.nutrition.protein}
                onChange={(e) =>
                  update({
                    nutrition: {
                      ...recipe.nutrition,
                      protein: e.target.value,
                    },
                  })
                }
                className="input-field"
              />
            </Field>
            <Field label="Carbs">
              <input
                type="text"
                value={recipe.nutrition.carbs}
                onChange={(e) =>
                  update({
                    nutrition: {
                      ...recipe.nutrition,
                      carbs: e.target.value,
                    },
                  })
                }
                className="input-field"
              />
            </Field>
            <Field label="Fat">
              <input
                type="text"
                value={recipe.nutrition.fat}
                onChange={(e) =>
                  update({
                    nutrition: { ...recipe.nutrition, fat: e.target.value },
                  })
                }
                className="input-field"
              />
            </Field>
            <Field label="Fiber">
              <input
                type="text"
                value={recipe.nutrition.fiber}
                onChange={(e) =>
                  update({
                    nutrition: {
                      ...recipe.nutrition,
                      fiber: e.target.value,
                    },
                  })
                }
                className="input-field"
              />
            </Field>
            <Field label="Sodium">
              <input
                type="text"
                value={recipe.nutrition.sodium}
                onChange={(e) =>
                  update({
                    nutrition: {
                      ...recipe.nutrition,
                      sodium: e.target.value,
                    },
                  })
                }
                className="input-field"
              />
            </Field>
          </div>
        </Section>
      </div>}

      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
        }
        .input-field:focus {
          outline: none;
          border-color: #f97316;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
        }
        .input-field::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border/50 bg-muted/50 px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value?.length ?? 0;
  return (
    <p
      className={`mt-1 text-right text-xs ${
        len > max ? "text-red-500" : "text-muted-foreground"
      }`}
    >
      {len}/{max}
    </p>
  );
}
