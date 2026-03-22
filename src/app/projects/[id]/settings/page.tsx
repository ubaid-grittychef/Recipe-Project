"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Project, FONT_PRESETS, TONE_OPTIONS, COLOR_PRESETS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  FileSpreadsheet,
  Palette,
  Search,
  MessageSquare,
  DollarSign,
  Database,
  Save,
  Loader2,
  Trash2,
  Sparkles,
  ClipboardCopy,
  CheckCircle2,
  Upload,
  ListChecks,
} from "lucide-react";
import { SkeletonSettingsPage } from "@/components/Skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const EDITABLE_FIELDS = [
  "name", "niche", "domain", "country", "language", "status",
  "logo_url", "primary_color", "font_preset", "tagline", "template_variant",
  "meta_description", "author_name", "target_audience", "site_category",
  "content_tone",
  "prompt_overrides",
  "sheet_url", "sheet_keyword_column", "sheet_restaurant_column", "sheet_status_column",
  "skimlinks_id", "amazon_associate_id", "hellofresh_url", "adsense_publisher_id", "ga_id",
  "site_supabase_url", "site_supabase_anon_key", "site_supabase_service_key",
  "vercel_token",
] as const;

interface Props {
  params: Promise<{ id: string }>;
}

const SECTIONS = [
  { id: "basic", title: "Basic Info", icon: Globe },
  { id: "keywords", title: "Keywords", icon: FileSpreadsheet },
  { id: "branding", title: "Branding", icon: Palette },
  { id: "seo", title: "SEO", icon: Search },
  { id: "ai", title: "AI Tone", icon: MessageSquare },
  { id: "prompts", title: "AI Prompt Overrides", icon: Sparkles },
  { id: "monetization", title: "Monetization", icon: DollarSign },
  { id: "database", title: "Deployment & Database", icon: Database },
] as const;

export default function ProjectSettingsPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["basic"]));
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<Project>(`/api/projects/${id}`)
      .then((data) => {
        setProject(data);
        setForm(data);
      })
      .catch((err) => {
        toast.error("Failed to load project settings");
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function toggleSection(sectionId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  const SECTION_FIELD_MAP: Record<string, string[]> = {
    basic: ["name", "niche", "domain", "country", "language", "status"],
    keywords: ["sheet_url", "sheet_keyword_column", "sheet_restaurant_column", "sheet_status_column"],
    branding: ["logo_url", "primary_color", "font_preset", "tagline", "template_variant"],
    seo: ["meta_description", "author_name", "target_audience", "site_category"],
    ai: ["content_tone"],
    prompts: ["prompt_overrides"],
    monetization: ["skimlinks_id", "amazon_associate_id", "hellofresh_url", "adsense_publisher_id", "ga_id"],
    database: ["site_supabase_url", "site_supabase_anon_key", "site_supabase_service_key", "vercel_token"],
  };

  function update(fields: Partial<Project>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function updateSection(sectionId: string, fields: Partial<Project>) {
    update(fields);
    setDirtyKeys((prev) => new Set([...prev, sectionId]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in form) {
          payload[key] = form[key as keyof Project];
        }
      }
      const prevTemplate = project?.template_variant;
      const updated = await api.put<Project>(`/api/projects/${id}`, payload);
      setProject(updated);
      setForm(updated);
      setDirtyKeys(new Set());
      if (updated.template_variant !== prevTemplate && updated.deployment_status === "deployed") {
        localStorage.setItem(`needs_redeploy_${id}`, "1");
      }
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error("[Settings] save failed:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSection(sectionId: string) {
    setSaving(true);
    try {
      const sectionFields = SECTION_FIELD_MAP[sectionId] ?? [];
      const payload: Record<string, unknown> = {};
      for (const key of sectionFields) {
        if (key in form) {
          payload[key] = form[key as keyof Project];
        }
      }
      const prevTemplate = project?.template_variant;
      const updated = await api.put<Project>(`/api/projects/${id}`, payload);
      setProject(updated);
      setForm((prev) => ({ ...prev, ...updated }));
      setDirtyKeys((prev) => { const next = new Set(prev); next.delete(sectionId); return next; });
      if (sectionId === "branding" && updated.template_variant !== prevTemplate && updated.deployment_status === "deployed") {
        localStorage.setItem(`needs_redeploy_${id}`, "1");
        toast.success("Branding saved — redeploy your site to apply the new template");
      } else {
        toast.success(`${SECTIONS.find((s) => s.id === sectionId)?.title ?? "Section"} saved`);
      }
    } catch (err) {
      console.error("[Settings] section save failed:", err);
      toast.error("Failed to save section");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    const confirmed = window.confirm(
      `Permanently delete "${project.name}"? This will remove all recipes, logs, and deployment records. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${id}`);
      toast.success("Project deleted");
      router.push("/");
    } catch (err) {
      console.error("[Settings] delete failed:", err);
      toast.error("Failed to delete project");
      setDeleting(false);
    }
  }

  if (loading) {
    return <SkeletonSettingsPage />;
  }

  if (!project) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/" className="mt-2 text-brand-500 hover:text-brand-600">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[
        { label: "All Projects", href: "/" },
        { label: project.name, href: `/projects/${id}` },
        { label: "Settings" },
      ]} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* Unsaved changes banner */}
      {dirtyKeys.size > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-amber-800">
              Unsaved changes in {dirtyKeys.size} section{dirtyKeys.size !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save All
          </button>
        </div>
      )}

      <div className="space-y-3">
        {SECTIONS.map(({ id: sectionId, title, icon: Icon }) => {
          const isDirty = dirtyKeys.has(sectionId);
          const sectionUpdate = (fields: Partial<Project>) => updateSection(sectionId, fields);
          return (
            <CollapsibleCard
              key={sectionId}
              title={title}
              icon={Icon}
              expanded={expanded.has(sectionId)}
              onToggle={() => toggleSection(sectionId)}
              isDirty={isDirty}
              onSave={() => handleSaveSection(sectionId)}
              saving={saving}
            >
              {sectionId === "basic" && (
                <SectionBasicInfo form={form} update={sectionUpdate} />
              )}
              {sectionId === "keywords" && (
                <SectionKeywords form={form} update={sectionUpdate} />
              )}
              {sectionId === "branding" && (
                <SectionBranding form={form} update={sectionUpdate} />
              )}
              {sectionId === "seo" && (
                <SectionSEO form={form} update={sectionUpdate} />
              )}
              {sectionId === "ai" && (
                <SectionAITone form={form} update={sectionUpdate} />
              )}
              {sectionId === "prompts" && (
                <SectionPrompts form={form} update={sectionUpdate} />
              )}
              {sectionId === "monetization" && (
                <SectionMonetization form={form} update={sectionUpdate} />
              )}
              {sectionId === "database" && (
                <SectionSiteDatabase form={form} update={sectionUpdate} />
              )}
            </CollapsibleCard>
          );
        })}
      </div>

      {/* Danger Zone */}
      <div className="mt-6 overflow-hidden rounded-xl border border-red-200 bg-card">
        <div className="border-b border-red-100 bg-red-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this project</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently removes all recipes, logs, and deployment records. This cannot be undone.
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? "Deleting..." : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CollapsibleCard({
  title,
  icon: Icon,
  expanded,
  onToggle,
  isDirty,
  onSave,
  saving,
  children,
}: {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  isDirty?: boolean;
  onSave?: () => void;
  saving?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", isDirty ? "border-amber-300" : "border-border")}>
      <div className="flex w-full items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isDirty ? "bg-amber-50" : "bg-brand-50")}>
            <Icon className={cn("h-4 w-4", isDirty ? "text-amber-500" : "text-brand-500")} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{title}</span>
            {isDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
          </div>
        </button>
        <div className="flex items-center gap-2">
          {isDirty && onSave && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          )}
          <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {expanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border/50 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function TextInput({
  value = "",
  onChange,
  placeholder,
  type = "text",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
    />
  );
}

function TextArea({
  value = "",
  onChange,
  placeholder,
  rows = 3,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
    />
  );
}

function SectionBasicInfo({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Site Name">
        <TextInput
          value={form.name}
          onChange={(v) => update({ name: v })}
          placeholder="e.g. Copycat Kitchen"
        />
      </Field>
      <Field label="Niche Description">
        <TextArea
          value={form.niche}
          onChange={(v) => update({ niche: v })}
          placeholder="e.g. Popular restaurant copycat recipes"
        />
      </Field>
      <Field label="Domain">
        <TextInput
          value={form.domain}
          onChange={(v) => update({ domain: v })}
          placeholder="example.com"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Country">
          <select
            value={form.country}
            onChange={(e) => update({ country: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="IE">Ireland</option>
            <option value="ZA">South Africa</option>
          </select>
        </Field>
        <Field label="Language">
          <select
            value={form.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="pt">Portuguese</option>
          </select>
        </Field>
      </div>
      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) =>
            update({ status: e.target.value as Project["status"] })
          }
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="setup">Setup</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </Field>
    </div>
  );
}

function SectionKeywords({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [sheetStatus, setSheetStatus] = useState<{
    valid: boolean;
    preview: Array<{ keyword: string; restaurant: string }>;
    error?: string;
  } | null>(null);
  const [queueCounts, setQueueCounts] = useState<{ pending: number; done: number; failed: number } | null>(null);
  const projectId = (form as Project).id;

  useEffect(() => {
    if (!form.sheet_url && projectId) {
      fetch(`/api/projects/${projectId}/queue`)
        .then((r) => r.json())
        .then((d) => setQueueCounts(d.counts))
        .catch(() => {});
    }
  }, [form.sheet_url, projectId]);

  async function validateSheet() {
    if (!form.sheet_url) {
      toast.error("Enter a Google Sheet URL first");
      return;
    }
    setValidating(true);
    setSheetStatus(null);
    try {
      const result = await api.post<{
        valid: boolean;
        preview: Array<{ keyword: string; restaurant: string }>;
        error?: string;
      }>("/api/sheets/validate", {
        sheet_url: form.sheet_url,
        keyword_col: form.sheet_keyword_column ?? "A",
        restaurant_col: form.sheet_restaurant_column ?? "B",
        status_col: form.sheet_status_column ?? "C",
      });
      setSheetStatus(result);
      if (result.valid) {
        toast.success(`Sheet connected — ${result.preview.length} pending keywords found`);
      } else {
        toast.error(result.error ?? "Could not connect to sheet");
      }
    } catch {
      toast.error("Failed to validate sheet");
    } finally {
      setValidating(false);
    }
  }

  async function importKeywords() {
    if (!projectId) { toast.error("Save project settings first"); return; }
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Paste at least one keyword"); return; }

    // Parse lines: "keyword" or "keyword, restaurant" or "keyword | restaurant"
    const keywords = lines.map((line) => {
      const sep = line.includes("|") ? "|" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      return { keyword: parts[0] ?? "", restaurant: parts[1] ?? "" };
    }).filter((k) => k.keyword);

    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.post<{ appended: number; message: string }>(
        `/api/projects/${projectId}/keywords/import`,
        { keywords }
      );
      setImportText("");
      setImportResult(result.message);
      toast.success(result.message);
    } catch {
      toast.error("Failed to import keywords — check Sheet permissions");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {!form.sheet_url && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Using Built-in Keyword Queue</p>
                <p className="mt-0.5 text-xs text-blue-600">
                  {queueCounts !== null
                    ? `${queueCounts.pending} pending · ${queueCounts.done} done${queueCounts.failed > 0 ? ` · ${queueCounts.failed} failed` : ""}`
                    : "No Google Sheet configured — keywords are managed in-app."}
                </p>
              </div>
            </div>
            {projectId && (
              <Link
                href={`/projects/${projectId}/queue`}
                className="shrink-0 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
              >
                Manage Queue →
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-blue-500">
            To use Google Sheets instead, add your sheet URL below.
          </p>
        </div>
      )}
      <Field
        label="Google Sheet URL"
        hint="Share the sheet with the service account email"
      >
        <TextInput
          value={form.sheet_url}
          onChange={(v) => { update({ sheet_url: v }); setSheetStatus(null); }}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Keyword Column">
          <TextInput
            value={form.sheet_keyword_column}
            onChange={(v) => update({ sheet_keyword_column: v })}
            placeholder="A"
          />
        </Field>
        <Field label="Restaurant Column">
          <TextInput
            value={form.sheet_restaurant_column}
            onChange={(v) => update({ sheet_restaurant_column: v })}
            placeholder="B"
          />
        </Field>
        <Field label="Status Column">
          <TextInput
            value={form.sheet_status_column}
            onChange={(v) => update({ sheet_status_column: v })}
            placeholder="C"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={validateSheet}
        disabled={validating}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
      >
        {validating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {validating ? "Connecting..." : "Test Sheet Connection"}
      </button>

      {sheetStatus && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-xs",
          sheetStatus.valid
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-600"
        )}>
          {sheetStatus.valid ? (
            <>
              <p className="font-medium">Sheet connected successfully</p>
              {sheetStatus.preview.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {sheetStatus.preview.slice(0, 3).map((kw, i) => (
                    <li key={i} className="text-emerald-600">
                      &bull; {kw.keyword}{kw.restaurant ? ` (${kw.restaurant})` : ""}
                    </li>
                  ))}
                  {sheetStatus.preview.length > 3 && (
                    <li className="text-emerald-500">…and {sheetStatus.preview.length - 3} more pending</li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <p>{sheetStatus.error ?? "Connection failed"}</p>
          )}
        </div>
      )}

      {/* Keyword import */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Import Keywords</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Paste keywords directly into your sheet — one per line.
          Optionally add a restaurant name separated by a comma or pipe: <span className="font-mono">Big Mac recipe, McDonald&apos;s</span>
        </p>
        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
          placeholder={"Big Mac copycat recipe, McDonald's\nOlive Garden Alfredo pasta\nChipotle burrito bowl | Chipotle"}
          rows={5}
          className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={importKeywords}
            disabled={importing || !importText.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing..." : "Add to Sheet"}
          </button>
          {importResult && (
            <span className="text-xs font-medium text-emerald-600">{importResult}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBranding({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Site Template">
        <div className="grid grid-cols-3 gap-3">
          {([
            {
              id: "default" as const,
              name: "Default",
              desc: "Clean, fast, minimal design",
              badge: null,
              letter: "D",
            },
            {
              id: "premium" as const,
              name: "Premium",
              desc: "Rich layout with hero images & enhanced SEO",
              badge: "Popular",
              letter: "P",
            },
            {
              id: "v3" as const,
              name: "Editorial",
              desc: "NYT-inspired editorial design. Sharp, red accent, serif headlines.",
              badge: "New",
              letter: "V3",
            },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ template_variant: t.id })}
              className={cn(
                "relative rounded-xl border-2 p-4 text-left transition-all",
                form.template_variant === t.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-border bg-card hover:border-border"
              )}
            >
              {t.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {t.badge}
                </span>
              )}
              <div className={cn(
                "mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                form.template_variant === t.id ? "bg-brand-500 text-white" : "bg-secondary text-muted-foreground"
              )}>
                {t.letter}
              </div>
              <p className={cn("text-sm font-semibold", form.template_variant === t.id ? "text-brand-900" : "text-foreground")}>
                {t.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
              {form.template_variant === t.id && (
                <div className="absolute right-3 bottom-3 h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        {form.template_variant !== undefined && (
          <p className="mt-2 text-xs text-amber-600">
            Changing the template requires a redeployment to take effect.
          </p>
        )}
      </Field>
      <Field label="Logo URL" hint="Optional">
        <TextInput
          value={form.logo_url ?? ""}
          onChange={(v) => update({ logo_url: v || null })}
          placeholder="https://example.com/logo.png"
        />
      </Field>
      <Field label="Primary Color">
        <div className="flex flex-wrap items-center gap-3">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update({ primary_color: color })}
              className={cn(
                "h-9 w-9 rounded-lg border-2 transition-all",
                form.primary_color === color
                  ? "border-slate-900 scale-110"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </Field>
      <Field label="Font Preset">
        <select
          value={form.font_preset}
          onChange={(e) => update({ font_preset: e.target.value })}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {FONT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.fonts}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tagline">
        <TextInput
          value={form.tagline}
          onChange={(v) => update({ tagline: v })}
          placeholder="e.g. Copy your favorite restaurant recipes at home"
        />
      </Field>
    </div>
  );
}

function SectionSEO({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Meta Description">
        <TextArea
          value={form.meta_description}
          onChange={(v) => update({ meta_description: v })}
          placeholder="Site meta description for search engines"
          rows={2}
        />
      </Field>
      <Field label="Author Name">
        <TextInput
          value={form.author_name}
          onChange={(v) => update({ author_name: v })}
          placeholder="e.g. Chef Sarah"
        />
      </Field>
      <Field label="Target Audience">
        <TextInput
          value={form.target_audience}
          onChange={(v) => update({ target_audience: v })}
          placeholder="e.g. Home cooks, busy families"
        />
      </Field>
      <Field label="Site Category">
        <TextInput
          value={form.site_category}
          onChange={(v) => update({ site_category: v })}
          placeholder="e.g. restaurant copycat recipes"
        />
      </Field>
    </div>
  );
}

function SectionAITone({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Content Tone">
        <div className="space-y-3">
          {TONE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                form.content_tone === opt.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-border hover:border-border"
              )}
            >
              <input
                type="radio"
                name="content_tone"
                value={opt.id}
                checked={form.content_tone === opt.id}
                onChange={() => update({ content_tone: opt.id })}
                className="text-brand-500"
              />
              <div>
                <span className="font-medium text-foreground">{opt.name}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {opt.description}
                </p>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  &quot;{opt.example}&quot;
                </p>
              </div>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

function SectionPrompts({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  const overrides = form.prompt_overrides ?? {};

  function set(key: keyof NonNullable<Project["prompt_overrides"]>, value: string) {
    update({
      prompt_overrides: {
        ...overrides,
        [key]: value || undefined,
      },
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Override any section of the AI recipe prompt for this project. Leave a field blank to use the built-in default. Changes apply to all future recipe generations.
      </p>

      <PromptField
        label="System Context"
        hint="Who the AI 'is' — e.g. a food blogger, restaurant expert, etc."
        placeholder="You are an expert SEO recipe writer for a {site_category} website targeting {target_audience}."
        value={overrides.system_context ?? ""}
        onChange={(v) => set("system_context", v)}
      />
      <PromptField
        label="Intro Section"
        hint="Instructions for the 300–500 word intro that appears before the recipe card."
        placeholder="A 300-500 word introduction with 2-3 **bolded subheadings**. Cover the dish story, flavor notes, and why readers will love it."
        value={overrides.intro ?? ""}
        onChange={(v) => set("intro", v)}
      />
      <PromptField
        label="Pro Tips"
        hint="Instructions for the tips array."
        placeholder="3-5 pro tips covering ingredient substitutions, storage, and common mistakes."
        value={overrides.tips ?? ""}
        onChange={(v) => set("tips", v)}
      />
      <PromptField
        label="FAQs"
        hint="Instructions for how FAQs should be written."
        placeholder="Commonly searched questions people type into Google about this recipe, with 2-3 sentence answers."
        value={overrides.faq ?? ""}
        onChange={(v) => set("faq", v)}
      />
      <PromptField
        label="Variations"
        hint="Instructions for the variations array."
        placeholder="3-4 recipe variations such as spicy, vegetarian, or slow-cooker versions."
        value={overrides.variations ?? ""}
        onChange={(v) => set("variations", v)}
      />
      <PromptField
        label="SEO Guidance"
        hint="Extra instructions for the seo_title and seo_description fields."
        placeholder="Emphasise urgency and taste in the meta description. Always include the restaurant name in the title."
        value={overrides.seo ?? ""}
        onChange={(v) => set("seo", v)}
      />
    </div>
  );
}

function PromptField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {value && (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Custom
          </span>
        )}
      </div>
      <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}

function SectionMonetization({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Skimlinks ID">
        <TextInput
          value={form.skimlinks_id ?? ""}
          onChange={(v) => update({ skimlinks_id: v || null })}
          placeholder="Optional"
        />
      </Field>
      <Field label="Amazon Associate ID">
        <TextInput
          value={form.amazon_associate_id ?? ""}
          onChange={(v) => update({ amazon_associate_id: v || null })}
          placeholder="Optional"
        />
      </Field>
      <Field label="HelloFresh URL">
        <TextInput
          value={form.hellofresh_url ?? ""}
          onChange={(v) => update({ hellofresh_url: v || null })}
          placeholder="Optional affiliate URL"
        />
      </Field>
      <Field label="AdSense Publisher ID">
        <TextInput
          value={form.adsense_publisher_id ?? ""}
          onChange={(v) => update({ adsense_publisher_id: v || null })}
          placeholder="ca-pub-xxxxxxxx"
        />
      </Field>
      <Field label="Google Analytics 4 ID" hint="Optional — for site traffic tracking">
        <TextInput
          value={form.ga_id ?? ""}
          onChange={(v) => update({ ga_id: v || null })}
          placeholder="G-XXXXXXXXXX"
        />
      </Field>
    </div>
  );
}

function SectionSiteDatabase({
  form,
  update,
}: {
  form: Partial<Project>;
  update: (f: Partial<Project>) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connStatus, setConnStatus] = useState<{
    connected: boolean;
    hasTable: boolean;
    recipeCount: number;
    error?: string;
  } | null>(null);

  const projectId = (form as Project).id;

  async function testConnection() {
    if (!projectId) {
      toast.error("Save project settings first");
      return;
    }
    setTesting(true);
    try {
      const result = await api.get<{
        connected: boolean;
        hasTable: boolean;
        recipeCount: number;
        error?: string;
      }>(`/api/projects/${projectId}/site`);
      setConnStatus(result);
      if (result.connected && result.hasTable) {
        toast.success(`Connected — ${result.recipeCount} recipes in database`);
      } else if (result.connected) {
        toast.error(result.error ?? "Table not found — run Setup Database");
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    } catch {
      toast.error("Failed to test connection");
    } finally {
      setTesting(false);
    }
  }

  async function setupDatabase() {
    if (!projectId) {
      toast.error("Save project settings first");
      return;
    }
    setSettingUp(true);
    try {
      const result = await api.post<{ success: boolean; error?: string }>(
        `/api/projects/${projectId}/site`,
        { action: "setup-schema" }
      );
      if (result.success) {
        toast.success("Database schema created successfully");
        // Re-test connection to refresh status
        const status = await api.get<{
          connected: boolean;
          hasTable: boolean;
          recipeCount: number;
          error?: string;
        }>(`/api/projects/${projectId}/site`);
        setConnStatus(status);
      } else {
        toast.error(result.error ?? "Setup failed — copy the SQL and run it manually in Supabase");
      }
    } catch {
      toast.error("Setup failed — copy the SQL and run it manually in Supabase");
    } finally {
      setSettingUp(false);
    }
  }

  async function copySQL() {
    if (!projectId) {
      toast.error("Save project settings first");
      return;
    }
    try {
      const result = await api.post<{ sql: string }>(
        `/api/projects/${projectId}/site`,
        { action: "get-sql" }
      );
      await navigator.clipboard.writeText(result.sql);
      setCopied(true);
      toast.success("SQL copied — paste it into your Supabase SQL editor");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy SQL");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure your Vercel account for deployment and your Supabase project for recipe storage.
      </p>

      {/* Vercel Token */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vercel Deployment</p>
        <Field
          label="Vercel API Token"
          hint={
            <span>
              Required to deploy your site.{" "}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:underline"
              >
                Get yours at vercel.com/account/tokens →
              </a>
            </span>
          }
        >
          <TextInput
            value={form.vercel_token ?? ""}
            onChange={(v) => update({ vercel_token: v || null })}
            placeholder="your-vercel-token"
            type="password"
          />
        </Field>
      </div>

      {/* Supabase */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Supabase Database</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Each recipe site needs its own Supabase project. Generated recipes are published here.
        </p>
      <Field label="Site Supabase URL">
        <TextInput
          value={form.site_supabase_url ?? ""}
          onChange={(v) => update({ site_supabase_url: v || null })}
          placeholder="https://xxx.supabase.co"
        />
      </Field>
      <Field label="Site Supabase Anon Key" hint="Used by the published site">
        <TextInput
          value={form.site_supabase_anon_key ?? ""}
          onChange={(v) => update({ site_supabase_anon_key: v || null })}
          placeholder="eyJ..."
        />
      </Field>
      <Field label="Site Supabase Service Key" hint="Used by the factory to push recipes">
        <TextInput
          value={form.site_supabase_service_key ?? ""}
          onChange={(v) => update({ site_supabase_service_key: v || null })}
          placeholder="eyJ..."
          type="password"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          Test Connection
        </button>

        <button
          type="button"
          onClick={setupDatabase}
          disabled={settingUp}
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          {settingUp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {settingUp ? "Setting up..." : "Setup Database"}
        </button>

        <button
          type="button"
          onClick={copySQL}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy SQL"}
        </button>
      </div>

      {connStatus && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-xs",
            connStatus.connected && connStatus.hasTable
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600"
          )}
        >
          {connStatus.connected && connStatus.hasTable
            ? `Connected — ${connStatus.recipeCount} recipes in database`
            : connStatus.error ?? "Not connected"}
          {connStatus.connected && !connStatus.hasTable && (
            <p className="mt-1 text-red-500">
              Click &quot;Setup Database&quot; to create the recipes table, or &quot;Copy SQL&quot; to run it manually in Supabase.
            </p>
          )}
        </div>
      )}
      </div>{/* end Supabase wrapper */}
    </div>
  );
}
