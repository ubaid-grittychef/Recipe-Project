"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  ChefHat,
  Database,
  Key,
  FileSpreadsheet,
  Rocket,
  Globe,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    id: "env",
    icon: Key,
    title: "1. Configure API Keys",
    description: "Set up the environment variables that power the factory.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Create a <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> file in
          the project root with these keys:
        </p>
        <EnvBlock
          lines={[
            "# Required for recipe generation",
            "OPENAI_API_KEY=sk-your-openai-key",
            "",
            "# Required for reading keywords from Google Sheets",
            "GOOGLE_SERVICE_ACCOUNT_EMAIL=your@project.iam.gserviceaccount.com",
            'GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----"',
            "",
            "# Required for deploying sites",
            "VERCEL_TOKEN=your-vercel-token",
            "",
            "# Optional: Factory database (without this, data lives in memory)",
            "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key",
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Get keys from:{" "}
          <ExtLink href="https://platform.openai.com/api-keys">OpenAI</ExtLink>
          {" · "}
          <ExtLink href="https://console.cloud.google.com/iam-admin/serviceaccounts">Google Cloud</ExtLink>
          {" · "}
          <ExtLink href="https://vercel.com/account/tokens">Vercel</ExtLink>
          {" · "}
          <ExtLink href="https://supabase.com/dashboard">Supabase</ExtLink>
        </p>
      </div>
    ),
  },
  {
    id: "factorydb",
    icon: Database,
    title: "2. Set Up the Factory Database (Optional but Recommended)",
    description: "Run the SQL migration in your Factory Supabase project to persist data across restarts.",
    content: <FactoryDbStep />,
  },
  {
    id: "project",
    icon: ChefHat,
    title: "3. Create a Recipe Site Project",
    description: "Use the wizard to configure your new recipe website.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Go to{" "}
          <Link href="/projects/new" className="text-brand-500 hover:text-brand-600">
            Create New Project
          </Link>{" "}
          and fill in:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Site Name</strong> — e.g. &quot;Copycat Kitchen&quot;</li>
          <li><strong>Niche</strong> — e.g. &quot;Restaurant copycat recipes for home cooks&quot;</li>
          <li><strong>Google Sheet URL</strong> — your keyword sheet (share it with the service account)</li>
          <li><strong>Branding</strong> — colors, fonts, tagline</li>
          <li><strong>AI Tone</strong> — casual, informative, or quick</li>
          <li><strong>Schedule</strong> — how many recipes per day and when</li>
        </ul>
      </div>
    ),
  },
  {
    id: "sheet",
    icon: FileSpreadsheet,
    title: "4. Set Up Your Google Sheet",
    description: "Create a Google Sheet with your target keywords.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Create a Google Sheet with 3 columns:</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">A — Keyword</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">B — Restaurant</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">C — Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr><td className="px-3 py-2">big mac recipe</td><td className="px-3 py-2">McDonald&apos;s</td><td className="px-3 py-2 text-muted-foreground">pending</td></tr>
              <tr><td className="px-3 py-2">crunchwrap supreme</td><td className="px-3 py-2">Taco Bell</td><td className="px-3 py-2 text-muted-foreground">pending</td></tr>
              <tr><td className="px-3 py-2">chicken sandwich recipe</td><td className="px-3 py-2">Chick-fil-A</td><td className="px-3 py-2 text-muted-foreground">pending</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Share the sheet with your Google service account email. Leave status blank or &quot;pending&quot; — the factory will update it to &quot;done&quot; after generation.
        </p>
      </div>
    ),
  },
  {
    id: "sitedb",
    icon: Database,
    title: "5. Create a Site Database",
    description: "Each recipe site needs its own Supabase project for storing recipes.",
    content: <SiteDbStep />,
  },
  {
    id: "generate",
    icon: ChefHat,
    title: "6. Generate Recipes",
    description: "Run the AI generation engine to create recipe content.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>From the project detail page, click <strong>Manual Run</strong> or set the project status to <strong>Active</strong> for automated daily generation.</p>
        <p>Each run will:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Read pending keywords from your Google Sheet</li>
          <li>Generate full recipes using GPT-4o mini</li>
          <li>Save recipes to the factory database</li>
          <li><strong>Automatically publish to your site&apos;s Supabase</strong></li>
          <li>Mark keywords as done in the sheet</li>
        </ol>
      </div>
    ),
  },
  {
    id: "deploy",
    icon: Rocket,
    title: "7. Deploy Your Site",
    description: "Deploy the recipe website to Vercel with one click.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>From the project detail page, go to <strong>Deploy & Domains</strong>:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Click <strong>Deploy to Vercel</strong> — uploads the template and builds the site</li>
          <li>Vercel assigns a <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.vercel.app</code> URL automatically</li>
          <li>Your recipes are already in the site database — the site is live!</li>
        </ol>
      </div>
    ),
  },
  {
    id: "domain",
    icon: Globe,
    title: "8. Connect Your Domain",
    description: "Point your custom domain to the deployed site.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>After deploying, add your custom domain in the Deploy & Domains page:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Enter your domain (e.g. copycatkitchen.com)</li>
          <li>Add the DNS records shown to your domain registrar</li>
          <li>SSL certificate is automatic</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Vercel handles HTTPS, CDN caching, and edge distribution automatically.
        </p>
      </div>
    ),
  },
];

export default function GuidePage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["env"]));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Setup Guide</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete these steps to go from zero to a live recipe SEO site
        </p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const open = expanded.has(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => toggle(step.id)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-4.5 w-4.5 text-brand-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                <ArrowRight
                  className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                />
              </button>
              {open && (
                <div className="border-t border-border/50 px-5 py-4 pl-[4.25rem]">
                  {step.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-emerald-900">After setup</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Once deployed, your site generates recipes on autopilot. Add more
              keywords to the Google Sheet at any time. The factory will keep
              generating and publishing until the sheet is empty (then auto-pause
              if configured).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FactoryDbStep() {
  const [copied, setCopied] = useState(false);

  async function copySql() {
    await navigator.clipboard.writeText(FACTORY_SQL);
    setCopied(true);
    toast.success("Factory SQL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>
        Without Supabase, project data lives in memory and resets on server restart.
        To persist data permanently, set up the factory database:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Create a Supabase project at{" "}
          <ExtLink href="https://supabase.com/dashboard">supabase.com</ExtLink>
        </li>
        <li>
          Copy your project URL and Anon Key into <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code>
          {" "}as <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
        </li>
        <li>Open the SQL Editor in Supabase and run this migration:</li>
      </ol>
      <div className="relative">
        <button
          onClick={copySql}
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-card/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:bg-card"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy SQL"}
        </button>
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
          {FACTORY_SQL}
        </pre>
      </div>
      <p className="text-xs text-muted-foreground">
        The full migration file is also available as <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">factory-schema.sql</code> in the project root.
      </p>
    </div>
  );
}

function SiteDbStep() {
  const [copied, setCopied] = useState(false);

  async function copySql() {
    await navigator.clipboard.writeText(FALLBACK_SQL);
    setCopied(true);
    toast.success("SQL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Go to{" "}
          <ExtLink href="https://supabase.com/dashboard">
            Supabase Dashboard
          </ExtLink>{" "}
          and create a new project for this recipe site
        </li>
        <li>
          Copy the project URL and keys into the project&apos;s Settings →
          Site Database section
        </li>
        <li>Open the SQL Editor in Supabase and run this migration:</li>
      </ol>
      <div className="relative">
        <button
          onClick={copySql}
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-card/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:bg-card"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy SQL"}
        </button>
        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
          {FALLBACK_SQL}
        </pre>
      </div>
    </div>
  );
}

function EnvBlock({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(lines.join("\n"));
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-card/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:bg-card"
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
        {lines.join("\n")}
      </pre>
    </div>
  );
}

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-brand-500 hover:text-brand-600"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

const FALLBACK_SQL = `CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  restaurant_name TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  intro_content TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  servings INTEGER DEFAULT 4,
  difficulty TEXT DEFAULT 'Medium',
  nutrition JSONB DEFAULT '{}',
  tips JSONB DEFAULT '[]',
  variations JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',
  rating NUMERIC(2,1) DEFAULT 4.8,
  seo_title TEXT,
  seo_description TEXT,
  focus_keywords JSONB DEFAULT '[]',
  image_search_term TEXT,
  image_url TEXT,
  word_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(published_at DESC);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON recipes
  FOR SELECT USING (status = 'published');`;

const FACTORY_SQL = `-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'US',
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'setup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logo_url TEXT, primary_color TEXT NOT NULL DEFAULT '#f97316',
  font_preset TEXT NOT NULL DEFAULT 'modern', tagline TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '', author_name TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '', site_category TEXT NOT NULL DEFAULT '',
  content_tone TEXT NOT NULL DEFAULT 'informative',
  sheet_url TEXT NOT NULL DEFAULT '', sheet_keyword_column TEXT NOT NULL DEFAULT 'A',
  sheet_restaurant_column TEXT NOT NULL DEFAULT 'B', sheet_status_column TEXT NOT NULL DEFAULT 'C',
  recipes_per_day INTEGER NOT NULL DEFAULT 5, generation_time TEXT NOT NULL DEFAULT '09:00',
  auto_pause_on_empty BOOLEAN NOT NULL DEFAULT true,
  skimlinks_id TEXT, amazon_associate_id TEXT, hellofresh_url TEXT,
  adsense_publisher_id TEXT, ga_id TEXT,
  site_supabase_url TEXT, site_supabase_anon_key TEXT, site_supabase_service_key TEXT,
  vercel_project_id TEXT, vercel_deployment_url TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'not_deployed',
  recipes_published INTEGER NOT NULL DEFAULT 0, keywords_remaining INTEGER NOT NULL DEFAULT 0,
  keywords_failed INTEGER NOT NULL DEFAULT 0,
  last_generation_at TIMESTAMPTZ, next_scheduled_at TIMESTAMPTZ
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL DEFAULT '', restaurant_name TEXT,
  title TEXT NOT NULL, slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', intro_content TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]', instructions JSONB NOT NULL DEFAULT '[]',
  prep_time TEXT NOT NULL DEFAULT '', cook_time TEXT NOT NULL DEFAULT '',
  total_time TEXT NOT NULL DEFAULT '', servings INTEGER NOT NULL DEFAULT 4,
  difficulty TEXT NOT NULL DEFAULT 'Medium', nutrition JSONB NOT NULL DEFAULT '{}',
  tips JSONB NOT NULL DEFAULT '[]', variations JSONB NOT NULL DEFAULT '[]',
  faqs JSONB NOT NULL DEFAULT '[]', rating NUMERIC(2,1) NOT NULL DEFAULT 4.8,
  seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '',
  focus_keywords JSONB NOT NULL DEFAULT '[]', image_search_term TEXT NOT NULL DEFAULT '',
  image_url TEXT, word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ,
  UNIQUE(project_id, slug)
);

-- Keyword Logs
CREATE TABLE IF NOT EXISTS keyword_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL, restaurant_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', error_reason TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generation Logs
CREATE TABLE IF NOT EXISTS generation_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
  keywords_processed INTEGER NOT NULL DEFAULT 0,
  keywords_succeeded INTEGER NOT NULL DEFAULT 0,
  keywords_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vercel_deployment_id TEXT, vercel_project_id TEXT,
  url TEXT, domain TEXT, status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ, env_vars JSONB NOT NULL DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_project ON recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_keyword_logs_project ON keyword_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_project ON generation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);`;
