"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  WizardFormData,
  FONT_PRESETS,
  TONE_OPTIONS,
  COLOR_PRESETS,
  Project,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Stepper } from "./WizardSteps";
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Globe,
  FileSpreadsheet,
  Palette,
  Search,
  MessageSquare,
  Calendar,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ListChecks,
  Sparkles,
} from "lucide-react";

const STEPS = [
  "Basic Info",
  "Keywords",
  "Branding",
  "SEO",
  "AI Tone",
  "Schedule",
  "Monetization",
  "Review",
];

const STEP_ICONS = [
  Globe,
  FileSpreadsheet,
  Palette,
  Search,
  MessageSquare,
  Calendar,
  DollarSign,
  CheckCircle2,
];

const defaultForm: WizardFormData = {
  name: "",
  niche: "",
  restaurant_category: "",
  domain: "",
  country: "US",
  language: "en",
  sheet_url: "",
  sheet_keyword_column: "A",
  sheet_restaurant_column: "B",
  sheet_status_column: "C",
  logo_url: "",
  primary_color: "#f97316",
  font_preset: "modern",
  tagline: "",
  meta_description: "",
  author_name: "",
  target_audience: "",
  site_category: "restaurant copycat recipes",
  content_tone: "informative",
  recipes_per_day: 5,
  generation_time: "09:00",
  auto_pause_on_empty: true,
  skimlinks_id: "",
  amazon_associate_id: "",
  hellofresh_url: "",
  adsense_publisher_id: "",
  ga_id: "",
  template_variant: "default",
};

function emptyToNull(val: string): string | null {
  return val.trim() || null;
}

export default function CreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [sheetError, setSheetError] = useState("");
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null); // field key being generated

  useEffect(() => {
    api
      .get<{ google_email: string | null }>("/api/settings/status")
      .then((s) => setGoogleEmail(s.google_email))
      .catch(() => {/* non-critical */});
  }, []);

  function update(fields: Partial<WizardFormData>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  async function validateSheet() {
    if (!form.sheet_url) {
      toast.error("Enter a Google Sheet URL first");
      return;
    }
    setSheetStatus("validating");
    setSheetError("");
    try {
      const result = await api.post<{
        valid: boolean;
        preview: unknown[];
        error?: string;
      }>("/api/sheets/validate", {
        sheet_url: form.sheet_url,
        keyword_col: form.sheet_keyword_column,
        restaurant_col: form.sheet_restaurant_column,
        status_col: form.sheet_status_column,
      });
      if (result.valid) {
        setSheetStatus("valid");
        toast.success(`Sheet connected — ${result.preview.length} keywords found`);
      } else {
        setSheetStatus("invalid");
        setSheetError(result.error || "Could not read sheet");
        toast.error(result.error || "Sheet validation failed");
      }
    } catch {
      setSheetStatus("invalid");
      setSheetError("Could not connect. Check the URL and service account permissions.");
      toast.error("Failed to validate sheet");
    }
  }

  async function fillAllWithAI() {
    if (!form.name.trim()) {
      toast.error("Enter a site name first — AI will use it to generate suggestions");
      return;
    }
    setAiLoading("all");
    try {
      const res = await api.post<{
        niche?: string; restaurant_category?: string; tagline?: string;
        meta_description?: string; author_name?: string; target_audience?: string;
        site_category?: string;
      }>("/api/ai/fill-project", { name: form.name, niche: form.niche });
      update({
        niche: res.niche ?? form.niche,
        restaurant_category: res.restaurant_category ?? form.restaurant_category,
        tagline: res.tagline ?? form.tagline,
        meta_description: res.meta_description ?? form.meta_description,
        author_name: res.author_name ?? form.author_name,
        target_audience: res.target_audience ?? form.target_audience,
        site_category: res.site_category ?? form.site_category,
      });
      toast.success("AI filled your site details — review and adjust as needed");
    } catch {
      toast.error("AI fill failed — check your OpenAI API key");
    } finally {
      setAiLoading(null);
    }
  }

  async function fillFieldWithAI(field: keyof WizardFormData) {
    if (!form.name.trim()) {
      toast.error("Enter a site name first");
      return;
    }
    setAiLoading(field);
    try {
      const res = await api.post<Record<string, string>>("/api/ai/fill-project", {
        name: form.name, niche: form.niche,
      });
      if (res[field]) update({ [field]: res[field] } as Partial<WizardFormData>);
    } catch {
      toast.error("AI generation failed");
    } finally {
      setAiLoading(null);
    }
  }

  async function handleLaunch() {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      setStep(0);
      return;
    }
    setSubmitting(true);
    try {
      const restaurantCategory = form.restaurant_category?.trim();
      const payload = {
        name: form.name.trim(),
        niche: form.niche.trim(),
        domain: form.domain.trim(),
        country: form.country,
        language: form.language,
        status: "active",
        sheet_url: form.sheet_url.trim(),
        sheet_keyword_column: form.sheet_keyword_column.trim() || "A",
        sheet_restaurant_column: form.sheet_restaurant_column.trim() || "B",
        sheet_status_column: form.sheet_status_column.trim() || "C",
        logo_url: emptyToNull(form.logo_url),
        primary_color: form.primary_color,
        font_preset: form.font_preset,
        tagline: form.tagline.trim(),
        meta_description: form.meta_description.trim(),
        author_name: form.author_name.trim(),
        target_audience: form.target_audience.trim(),
        site_category: restaurantCategory || form.site_category.trim(),
        content_tone: form.content_tone,
        recipes_per_day: form.recipes_per_day,
        generation_time: form.generation_time,
        auto_pause_on_empty: form.auto_pause_on_empty,
        skimlinks_id: emptyToNull(form.skimlinks_id),
        amazon_associate_id: emptyToNull(form.amazon_associate_id),
        hellofresh_url: emptyToNull(form.hellofresh_url),
        adsense_publisher_id: emptyToNull(form.adsense_publisher_id),
        ga_id: emptyToNull(form.ga_id),
        template_variant: form.template_variant,
      };

      const project = await api.post<Project>("/api/projects", payload);
      if (!project?.id) {
        throw new Error("Server returned a project without an ID");
      }
      toast.success("Project created successfully!");
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error("[Wizard] Failed to create project:", error);
      toast.error(
        "Failed to create project. Check your settings and try again."
      );
      setSubmitting(false);
    }
  }

  const StepIcon = STEP_ICONS[step];

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper steps={STEPS} currentStep={step} />

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
            <StepIcon className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {STEPS[step]}
            </h3>
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {step === 0 && (
            <StepBasicInfo
              form={form}
              update={update}
              aiLoading={aiLoading}
              onFillAll={fillAllWithAI}
            />
          )}
          {step === 1 && (
            <StepKeywords
              form={form}
              update={update}
              sheetStatus={sheetStatus}
              sheetError={sheetError}
              onValidate={validateSheet}
              googleEmail={googleEmail}
            />
          )}
          {step === 2 && (
            <StepBranding
              form={form}
              update={update}
              aiLoading={aiLoading}
              fillField={fillFieldWithAI}
            />
          )}
          {step === 3 && (
            <StepSEO
              form={form}
              update={update}
              aiLoading={aiLoading}
              fillField={fillFieldWithAI}
            />
          )}
          {step === 4 && <StepTone form={form} update={update} />}
          {step === 5 && <StepSchedule form={form} update={update} />}
          {step === 6 && <StepMonetization form={form} update={update} />}
          {step === 7 && <StepReview form={form} />}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
          <button
            onClick={prev}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              step === 0
                ? "cursor-not-allowed text-muted-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {submitting ? "Launching..." : "Launch Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  form: WizardFormData;
  update: (fields: Partial<WizardFormData>) => void;
}

function Field({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
        </div>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
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
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
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

function StepBasicInfo({
  form,
  update,
  aiLoading,
  onFillAll,
}: StepProps & {
  aiLoading: string | null;
  onFillAll: () => void;
}) {
  return (
    <>
      <Field label="Site Name">
        <TextInput
          value={form.name}
          onChange={(v) => update({ name: v })}
          placeholder="e.g. Copycat Kitchen"
        />
      </Field>

      {/* AI fill button */}
      <button
        type="button"
        onClick={onFillAll}
        disabled={aiLoading === "all" || !form.name.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
      >
        {aiLoading === "all" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {aiLoading === "all" ? "AI is thinking…" : "Fill remaining fields with AI"}
      </button>

      <Field label="Niche Description">
        <TextArea
          value={form.niche}
          onChange={(v) => update({ niche: v })}
          placeholder="e.g. Popular restaurant copycat recipes for home cooks"
        />
      </Field>
      <Field label="Target Restaurant / Cuisine Category">
        <TextInput
          value={form.restaurant_category}
          onChange={(v) => update({ restaurant_category: v })}
          placeholder="e.g. Fast food chains, Italian restaurants"
        />
      </Field>
      <Field label="Custom Domain" hint="Optional — can be added later">
        <TextInput
          value={form.domain}
          onChange={(v) => update({ domain: v })}
          placeholder="e.g. copycatkitchen.com"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Target Country">
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
    </>
  );
}

function StepKeywords({
  form,
  update,
  sheetStatus,
  sheetError,
  onValidate,
  googleEmail,
}: StepProps & {
  sheetStatus: string;
  sheetError: string;
  onValidate: () => void;
  googleEmail: string | null;
}) {
  // "builtin" = no sheet_url; "sheets" = using Google Sheets
  const mode = form.sheet_url !== undefined && form.sheet_url !== "" ? "sheets" : "builtin";

  function setMode(m: "builtin" | "sheets") {
    if (m === "builtin") update({ sheet_url: "" });
    // If switching to sheets, just focus the URL field — don't auto-fill anything
  }

  return (
    <>
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("builtin")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
            mode === "builtin"
              ? "border-brand-400 bg-brand-50"
              : "border-border bg-card hover:border-border"
          )}
        >
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            mode === "builtin" ? "bg-brand-100" : "bg-secondary"
          )}>
            <ListChecks className={cn("h-5 w-5", mode === "builtin" ? "text-brand-600" : "text-muted-foreground")} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", mode === "builtin" ? "text-brand-900" : "text-foreground")}>
              Built-in Queue
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste keywords directly in the app — no Google account needed
            </p>
          </div>
          {mode === "builtin" && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-white">Selected</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode("sheets")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
            mode === "sheets"
              ? "border-brand-400 bg-brand-50"
              : "border-border bg-card hover:border-border"
          )}
        >
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            mode === "sheets" ? "bg-brand-100" : "bg-secondary"
          )}>
            <FileSpreadsheet className={cn("h-5 w-5", mode === "sheets" ? "text-brand-600" : "text-muted-foreground")} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", mode === "sheets" ? "text-brand-900" : "text-foreground")}>
              Google Sheets
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect a spreadsheet — keywords are read and marked done automatically
            </p>
          </div>
          {mode === "sheets" && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-white">Selected</span>
          )}
        </button>
      </div>

      {/* Built-in queue info */}
      {mode === "builtin" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">You&apos;re all set!</p>
          <p className="mt-1 text-xs text-blue-600">
            After creating the project, go to <strong>Keyword Queue</strong> on your project dashboard to paste in your keywords. Generation will use them automatically.
          </p>
        </div>
      )}

      {/* Google Sheets fields */}
      {mode === "sheets" && (
        <>
          <Field
            label="Google Sheet URL"
            hint="Share the sheet with the service account email below"
          >
            <TextInput
              value={form.sheet_url}
              onChange={(v) => update({ sheet_url: v })}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </Field>

          {googleEmail ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium text-emerald-800">
                Share your Google Sheet with this service account:
              </p>
              <p className="mt-1 break-all font-mono text-xs text-emerald-700 select-all">
                {googleEmail}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-800">
                <strong>Google Sheets not configured.</strong> Add{" "}
                <code className="font-mono">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and{" "}
                <code className="font-mono">GOOGLE_PRIVATE_KEY</code> to{" "}
                <code className="font-mono">.env.local</code>, then restart the server.
              </p>
            </div>
          )}

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onValidate}
              disabled={!form.sheet_url || sheetStatus === "validating"}
              className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              {sheetStatus === "validating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sheetStatus === "valid" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {sheetStatus === "validating"
                ? "Validating..."
                : sheetStatus === "valid"
                ? "Connected"
                : "Test Connection"}
            </button>
            {form.sheet_url && (
              <a
                href={form.sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open sheet
              </a>
            )}
          </div>
          {sheetStatus === "invalid" && sheetError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{sheetError}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AiButton({
  field,
  aiLoading,
  fillField,
}: {
  field: keyof WizardFormData;
  aiLoading: string | null;
  fillField: (f: keyof WizardFormData) => void;
}) {
  const loading = aiLoading === field;
  return (
    <button
      type="button"
      onClick={() => fillField(field)}
      disabled={!!aiLoading}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-40"
      title="Generate with AI"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "…" : "AI"}
    </button>
  );
}

function StepBranding({
  form,
  update,
  aiLoading,
  fillField,
}: StepProps & {
  aiLoading: string | null;
  fillField: (f: keyof WizardFormData) => void;
}) {
  return (
    <>
      <Field label="Logo URL" hint="Optional — paste a link to your logo">
        <TextInput
          value={form.logo_url}
          onChange={(v) => update({ logo_url: v })}
          placeholder="https://example.com/logo.png"
        />
      </Field>
      <Field label="Primary Color">
        <div className="flex flex-wrap items-center gap-3">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
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
          <input
            type="color"
            value={form.primary_color}
            onChange={(e) => update({ primary_color: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border-2 border-border"
          />
        </div>
      </Field>
      <Field label="Font Pairing">
        <div className="grid grid-cols-1 gap-2">
          {FONT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => update({ font_preset: preset.id })}
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all",
                form.font_preset === preset.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-border hover:border-border"
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {preset.name}
                </p>
                <p className="text-xs text-muted-foreground">{preset.fonts}</p>
              </div>
              {form.font_preset === preset.id && (
                <CheckCircle2 className="h-5 w-5 text-brand-500" />
              )}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label="Site Tagline"
        action={<AiButton field="tagline" aiLoading={aiLoading} fillField={fillField} />}
      >
        <TextInput
          value={form.tagline}
          onChange={(v) => update({ tagline: v })}
          placeholder="e.g. Restaurant-quality recipes made easy at home"
        />
      </Field>
      <Field label="Site Template" hint="Choose the visual design for your recipe site">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: "default" as const,
              name: "Clean & Modern",
              description: "Light, airy layout. Fast and minimal. Great for most niches.",
              preview: "bg-card border-border",
              accent: "bg-secondary",
            },
            {
              id: "premium" as const,
              name: "Premium Dark",
              description: "Bold dark hero, sticky sidebar. High-converting. Best for competitive niches.",
              preview: "bg-slate-900 border-slate-700",
              accent: "bg-slate-700",
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => update({ template_variant: t.id })}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all",
                form.template_variant === t.id
                  ? "border-brand-500 shadow-md"
                  : "border-border hover:border-border"
              )}
            >
              {/* Mini preview mockup */}
              <div className={cn("mb-3 h-16 rounded-lg border", t.preview)}>
                <div className={cn("mx-3 mt-2 h-2 w-2/3 rounded", t.accent)} />
                <div className={cn("mx-3 mt-1 h-1.5 w-1/2 rounded opacity-60", t.accent)} />
                <div className={cn("mx-3 mt-1.5 flex gap-1")}>
                  <div className={cn("h-6 w-1/3 rounded", t.accent)} />
                  <div className={cn("h-6 flex-1 rounded opacity-40", t.accent)} />
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              {form.template_variant === t.id && (
                <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-brand-500" />
              )}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function StepSEO({
  form,
  update,
  aiLoading,
  fillField,
}: StepProps & {
  aiLoading: string | null;
  fillField: (f: keyof WizardFormData) => void;
}) {
  return (
    <>
      <Field
        label="Site Meta Description"
        hint="For search engine results"
        action={<AiButton field="meta_description" aiLoading={aiLoading} fillField={fillField} />}
      >
        <TextArea
          value={form.meta_description}
          onChange={(v) => update({ meta_description: v })}
          placeholder="e.g. Discover easy copycat recipes from your favorite restaurants. Step-by-step guides to recreate popular dishes at home."
        />
      </Field>
      <Field
        label="Default Author Name"
        hint="Builds E-E-A-T trust signals"
        action={<AiButton field="author_name" aiLoading={aiLoading} fillField={fillField} />}
      >
        <TextInput
          value={form.author_name}
          onChange={(v) => update({ author_name: v })}
          placeholder="e.g. Chef Sarah Mitchell"
        />
      </Field>
      <Field
        label="Target Audience"
        action={<AiButton field="target_audience" aiLoading={aiLoading} fillField={fillField} />}
      >
        <TextInput
          value={form.target_audience}
          onChange={(v) => update({ target_audience: v })}
          placeholder="e.g. Home cooks aged 25-45 who love dining out"
        />
      </Field>
      <Field
        label="Site Category"
        action={<AiButton field="site_category" aiLoading={aiLoading} fillField={fillField} />}
      >
        <TextInput
          value={form.site_category}
          onChange={(v) => update({ site_category: v })}
          placeholder="e.g. restaurant copycat recipes"
        />
      </Field>
    </>
  );
}

function StepTone({ form, update }: StepProps) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Choose the writing style for all AI-generated content on this site.
      </p>
      <div className="space-y-3">
        {TONE_OPTIONS.map((tone) => (
          <button
            key={tone.id}
            onClick={() => update({ content_tone: tone.id })}
            className={cn(
              "w-full rounded-lg border p-4 text-left transition-all",
              form.content_tone === tone.id
                ? "border-brand-500 bg-brand-50"
                : "border-border hover:border-border"
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {tone.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tone.description}
                </p>
                <p className="mt-3 rounded-md border border-border/50 bg-card px-3 py-2 text-xs italic text-muted-foreground">
                  &ldquo;{tone.example}&rdquo;
                </p>
              </div>
              {form.content_tone === tone.id && (
                <CheckCircle2 className="ml-3 h-5 w-5 shrink-0 text-brand-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepSchedule({ form, update }: StepProps) {
  return (
    <>
      <Field label="Recipes Per Day">
        <input
          type="number"
          min={1}
          max={50}
          value={form.recipes_per_day}
          onChange={(e) =>
            update({ recipes_per_day: parseInt(e.target.value) || 1 })
          }
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </Field>
      <Field label="Generation Time" hint="24-hour format, server timezone">
        <input
          type="time"
          value={form.generation_time}
          onChange={(e) => update({ generation_time: e.target.value })}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </Field>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.auto_pause_on_empty}
          onChange={(e) => update({ auto_pause_on_empty: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        <div>
          <span className="text-sm font-medium text-foreground">
            Auto-pause when keywords run out
          </span>
          <p className="text-xs text-muted-foreground">
            Generation will stop automatically when there are no more pending
            keywords in the sheet.
          </p>
        </div>
      </label>
    </>
  );
}

function StepMonetization({ form, update }: StepProps) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        All fields are optional. Skip any you don&apos;t use. You can always add
        them later in project settings.
      </p>
      <Field label="Skimlinks Publisher ID">
        <TextInput
          value={form.skimlinks_id}
          onChange={(v) => update({ skimlinks_id: v })}
          placeholder="e.g. 123456X789012"
        />
      </Field>
      <Field label="Amazon Associates Tag">
        <TextInput
          value={form.amazon_associate_id}
          onChange={(v) => update({ amazon_associate_id: v })}
          placeholder="e.g. yoursite-20"
        />
      </Field>
      <Field label="HelloFresh Affiliate URL">
        <TextInput
          value={form.hellofresh_url}
          onChange={(v) => update({ hellofresh_url: v })}
          placeholder="https://www.hellofresh.com/?c=YOUR_CODE"
        />
      </Field>
      <Field label="AdSense / Ezoic Publisher ID">
        <TextInput
          value={form.adsense_publisher_id}
          onChange={(v) => update({ adsense_publisher_id: v })}
          placeholder="e.g. ca-pub-1234567890"
        />
      </Field>
      <Field label="Google Analytics 4 ID" hint="Optional — tracks visits on your published site">
        <TextInput
          value={form.ga_id}
          onChange={(v) => update({ ga_id: v })}
          placeholder="e.g. G-XXXXXXXXXX"
        />
      </Field>
    </>
  );
}

function StepReview({ form }: { form: WizardFormData }) {
  const sections = [
    {
      title: "Basic Info",
      items: [
        ["Site Name", form.name],
        ["Niche", form.niche],
        ["Category", form.restaurant_category],
        ["Domain", form.domain || "Not set"],
        ["Country", form.country],
        ["Language", form.language],
      ],
    },
    {
      title: "Keywords",
      items: [
        ["Sheet URL", form.sheet_url ? "Connected" : "Not set"],
        [
          "Columns",
          `${form.sheet_keyword_column}, ${form.sheet_restaurant_column}, ${form.sheet_status_column}`,
        ],
      ],
    },
    {
      title: "Branding",
      items: [
        ["Primary Color", form.primary_color],
        [
          "Font",
          FONT_PRESETS.find((f) => f.id === form.font_preset)?.name ??
            form.font_preset,
        ],
        ["Tagline", form.tagline],
      ],
    },
    {
      title: "SEO",
      items: [
        ["Author", form.author_name],
        ["Category", form.site_category],
        ["Audience", form.target_audience],
      ],
    },
    {
      title: "AI & Schedule",
      items: [
        [
          "Tone",
          TONE_OPTIONS.find((t) => t.id === form.content_tone)?.name ??
            form.content_tone,
        ],
        ["Recipes/Day", String(form.recipes_per_day)],
        ["Run Time", form.generation_time],
        ["Auto-pause", form.auto_pause_on_empty ? "Yes" : "No"],
      ],
    },
    {
      title: "Monetization",
      items: [
        ["Skimlinks", form.skimlinks_id || "Not set"],
        ["Amazon", form.amazon_associate_id || "Not set"],
        ["HelloFresh", form.hellofresh_url ? "Connected" : "Not set"],
        ["AdSense", form.adsense_publisher_id || "Not set"],
        ["GA4", form.ga_id || "Not set"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review your project settings. You can go back to any step to make
        changes.
      </p>
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-lg border border-border p-4"
        >
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </h4>
          <dl className="space-y-1.5">
            {section.items.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="max-w-[60%] truncate text-sm font-medium text-foreground">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
