"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Restaurant } from "@/lib/types";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChefHat,
  Save,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  website_url: "",
};

export default function RestaurantsPage({ params }: Props) {
  const { id } = use(params);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingBioId, setGeneratingBioId] = useState<string | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();

  useEffect(() => {
    api
      .get<Restaurant[]>(`/api/projects/${id}/restaurants`)
      .then(setRestaurants)
      .catch(() => toast.error("Failed to load restaurants"))
      .finally(() => setLoading(false));
  }, [id]);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(r: Restaurant) {
    setForm({
      name: r.name,
      slug: r.slug,
      description: r.description ?? "",
      logo_url: r.logo_url ?? "",
      website_url: r.website_url ?? "",
    });
    setEditingId(r.id);
    setAdding(false);
  }

  function cancelEdit() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from name while slug hasn't been manually edited
      if (field === "name" && (!prev.slug || prev.slug === slugify(prev.name))) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }
    setSaving(true);
    try {
      if (adding) {
        const created = await api.post<Restaurant>(
          `/api/projects/${id}/restaurants`,
          {
            name: form.name.trim(),
            slug: form.slug.trim() || slugify(form.name.trim()),
            description: form.description.trim() || null,
            logo_url: form.logo_url.trim() || null,
            website_url: form.website_url.trim() || null,
          }
        );
        setRestaurants((prev) => [...prev, created]);
        toast.success("Restaurant added");
      } else if (editingId) {
        const updated = await api.put<Restaurant>(
          `/api/projects/${id}/restaurants/${editingId}`,
          {
            name: form.name.trim(),
            slug: form.slug.trim() || slugify(form.name.trim()),
            description: form.description.trim() || null,
            logo_url: form.logo_url.trim() || null,
            website_url: form.website_url.trim() || null,
          }
        );
        setRestaurants((prev) =>
          prev.map((r) => (r.id === editingId ? updated : r))
        );
        toast.success("Restaurant updated");
      }
      cancelEdit();
    } catch {
      toast.error("Failed to save restaurant");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateBio(restaurantId: string) {
    setGeneratingBioId(restaurantId);
    try {
      const result = await api.post<{ description: string; restaurant: Restaurant }>(
        `/api/projects/${id}/restaurants/${restaurantId}/generate-bio`
      );
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurantId ? result.restaurant : r))
      );
      toast.success("Bio generated");
    } catch {
      toast.error("Failed to generate bio — check OPENAI_API_KEY");
    } finally {
      setGeneratingBioId(null);
    }
  }

  async function handleDelete(restaurantId: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(restaurantId);
    try {
      await api.delete(`/api/projects/${id}/restaurants/${restaurantId}`);
      setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      toast.success("Restaurant deleted");
    } catch {
      toast.error("Failed to delete restaurant");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {ConfirmDialog}
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CMS entries for restaurants — each one becomes a category page on your site.
          </p>
        </div>
        {!adding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add Restaurant
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {(adding || editingId) && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-foreground">
            {adding ? "Add Restaurant" : "Edit Restaurant"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="e.g. McDonald's"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </FormField>
            <FormField label="Slug" hint="Auto-generated from name">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateForm("slug", e.target.value)}
                placeholder="e.g. mcdonalds"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Short description shown on the category page"
                rows={2}
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </FormField>
            <FormField label="Logo URL">
              <input
                type="url"
                value={form.logo_url}
                onChange={(e) => updateForm("logo_url", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </FormField>
            <FormField label="Website URL">
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => updateForm("website_url", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </FormField>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-muted/50 py-20 text-center">
          <ChefHat className="mx-auto h-12 w-12 text-slate-200" />
          <p className="mt-4 text-sm font-medium text-foreground">No restaurants yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add restaurants here to create rich category pages on your site.
          </p>
          <button
            onClick={startAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add First Restaurant
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="min-w-full divide-y divide-border/50">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Restaurant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Slug
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                  Description
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                  Website
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {restaurants.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-accent">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.logo_url}
                          alt={r.name}
                          className="h-8 w-8 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                          <ChefHat className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-foreground">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      {r.slug}
                    </code>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                      {r.description || "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {r.website_url ? (
                      <a
                        href={r.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleGenerateBio(r.id)}
                        disabled={generatingBioId === r.id || editingId === r.id || adding}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-purple-50 hover:text-purple-500 disabled:opacity-40"
                        title="Auto-generate description with AI"
                      >
                        {generatingBioId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(r)}
                        disabled={editingId === r.id || adding}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deletingId === r.id}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Delete"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
