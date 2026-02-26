-- ============================================================
-- Recipe SEO Site Factory — Supabase Schema
-- Run this in your Factory Supabase project's SQL Editor
-- ============================================================

-- Projects table
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

  -- Branding
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#f97316',
  font_preset TEXT NOT NULL DEFAULT 'modern',
  tagline TEXT NOT NULL DEFAULT '',

  -- SEO
  meta_description TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  site_category TEXT NOT NULL DEFAULT '',

  -- AI
  content_tone TEXT NOT NULL DEFAULT 'informative',
  prompt_overrides JSONB,

  -- Google Sheet
  sheet_url TEXT NOT NULL DEFAULT '',
  sheet_keyword_column TEXT NOT NULL DEFAULT 'A',
  sheet_restaurant_column TEXT NOT NULL DEFAULT 'B',
  sheet_status_column TEXT NOT NULL DEFAULT 'C',

  -- Schedule
  recipes_per_day INTEGER NOT NULL DEFAULT 5,
  generation_time TEXT NOT NULL DEFAULT '09:00',
  auto_pause_on_empty BOOLEAN NOT NULL DEFAULT true,

  -- Monetization
  skimlinks_id TEXT,
  amazon_associate_id TEXT,
  hellofresh_url TEXT,
  adsense_publisher_id TEXT,
  ga_id TEXT,

  -- Site Supabase
  site_supabase_url TEXT,
  site_supabase_anon_key TEXT,
  site_supabase_service_key TEXT,

  -- Deployment
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'not_deployed',

  -- Stats
  recipes_published INTEGER NOT NULL DEFAULT 0,
  keywords_remaining INTEGER NOT NULL DEFAULT 0,
  keywords_failed INTEGER NOT NULL DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL DEFAULT '',
  restaurant_name TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  intro_content TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  prep_time TEXT NOT NULL DEFAULT '',
  cook_time TEXT NOT NULL DEFAULT '',
  total_time TEXT NOT NULL DEFAULT '',
  servings INTEGER NOT NULL DEFAULT 4,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  nutrition JSONB NOT NULL DEFAULT '{}',
  tips JSONB NOT NULL DEFAULT '[]',
  variations JSONB NOT NULL DEFAULT '[]',
  faqs JSONB NOT NULL DEFAULT '[]',
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.8,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  focus_keywords JSONB NOT NULL DEFAULT '[]',
  image_search_term TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(project_id, slug)
);

-- Keyword logs table
CREATE TABLE IF NOT EXISTS keyword_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  restaurant_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_reason TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generation logs table
CREATE TABLE IF NOT EXISTS generation_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  keywords_processed INTEGER NOT NULL DEFAULT 0,
  keywords_succeeded INTEGER NOT NULL DEFAULT 0,
  keywords_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vercel_deployment_id TEXT,
  vercel_project_id TEXT,
  url TEXT,
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  env_vars JSONB NOT NULL DEFAULT '{}'
);

-- Restaurants table (CMS entries — each maps to a category page on the site)
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_project ON restaurants(project_id);
CREATE INDEX IF NOT EXISTS idx_recipes_project ON recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_logs_project ON keyword_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_project ON generation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);

-- Row Level Security — factory is private (no public access)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by the factory server)
-- Anon key has NO access (dashboard is password-protected at the app level)
CREATE POLICY IF NOT EXISTS "Service role only" ON projects
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role only" ON recipes
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role only" ON keyword_logs
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role only" ON generation_logs
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role only" ON deployments
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role only" ON restaurants
  USING (auth.role() = 'service_role');

-- Migration helpers — run these if upgrading from a previous schema version:
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS prompt_overrides JSONB;
-- ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;
-- (The restaurants table is new — create it using the CREATE TABLE above)
