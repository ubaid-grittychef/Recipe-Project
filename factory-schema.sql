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
  vercel_token TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'not_deployed',

  -- Stats
  recipes_published INTEGER NOT NULL DEFAULT 0,
  keywords_remaining INTEGER NOT NULL DEFAULT 0,
  keywords_failed INTEGER NOT NULL DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  generation_status TEXT NOT NULL DEFAULT 'idle',

  -- Publish schedule
  publish_schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  publish_time TEXT NOT NULL DEFAULT '09:00',
  publish_per_day INTEGER NOT NULL DEFAULT 3,
  publish_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  next_publish_at TIMESTAMPTZ,
  last_published_at TIMESTAMPTZ
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON projects USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON recipes USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keyword_logs' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON keyword_logs USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'generation_logs' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON generation_logs USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deployments' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON deployments USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON restaurants USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Migration helpers — run these if upgrading from a previous schema version:
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS prompt_overrides JSONB;
-- ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;
-- (The restaurants table is new — create it using the CREATE TABLE above)

-- ============================================================
-- Built-in Keyword Queue
-- Alternative to Google Sheets for managing generation keywords
-- ============================================================

CREATE TABLE IF NOT EXISTS builtin_keywords (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  restaurant_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  error_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS builtin_keywords_project_status ON builtin_keywords(project_id, status);
CREATE INDEX IF NOT EXISTS builtin_keywords_created_at ON builtin_keywords(created_at);

ALTER TABLE builtin_keywords ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'builtin_keywords' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON builtin_keywords USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Migration: if upgrading from a previous schema, run:
-- (The builtin_keywords table is new — create it using the CREATE TABLE above)

-- ============================================================
-- Categories (auto-created from AI-generated recipe categories)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  recipe_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);

CREATE INDEX IF NOT EXISTS categories_project_id ON categories(project_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Service role only') THEN
    CREATE POLICY "Service role only" ON categories USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Migration: add restaurant_id and category_id to recipes table
-- ALTER TABLE recipes ADD COLUMN IF NOT EXISTS restaurant_id TEXT REFERENCES restaurants(id) ON DELETE SET NULL;
-- ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================================
-- PROFILES (Supabase Auth users extension)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  full_name            TEXT NOT NULL DEFAULT '',
  role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  subscription_status  TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive')),
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  monthly_recipe_quota INTEGER NOT NULL DEFAULT 200,
  recipes_generated_this_month INTEGER NOT NULL DEFAULT 0,
  quota_reset_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Auto-create profile on signup
-- SECURITY DEFINER: runs as DB owner, bypasses RLS.
-- All profile creation goes through this trigger. Direct SDK inserts not supported.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- RLS helpers (security definer to avoid policy self-reference recursion)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_subscription_status()
RETURNS TEXT AS $$
  SELECT subscription_status FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Add user_id to projects (run after profiles table exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own projects" ON projects
  FOR ALL USING (
    user_id = auth.uid() OR get_my_role() = 'admin'
  );

-- ============================================================
-- JWT CUSTOM CLAIMS HOOK
-- Register in: Supabase Dashboard → Auth → Hooks → Custom Access Token Hook
-- Select function: custom_jwt_claims
-- ============================================================
CREATE OR REPLACE FUNCTION custom_jwt_claims(event JSONB)
RETURNS JSONB AS $$
DECLARE
  profile_row profiles;
BEGIN
  SELECT * INTO profile_row FROM profiles WHERE id = (event->>'user_id')::UUID;
  RETURN jsonb_set(
    event,
    '{claims}',
    (event->'claims') || jsonb_build_object(
      'user_role', COALESCE(profile_row.role, 'user'),
      'subscription_status', COALESCE(profile_row.subscription_status, 'inactive')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Market readiness: billing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Market readiness: quota columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_recipe_quota INTEGER NOT NULL DEFAULT 200;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recipes_generated_this_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ;
