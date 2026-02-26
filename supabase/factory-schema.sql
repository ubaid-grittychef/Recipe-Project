-- Factory Dashboard Database Schema
-- Run this in the Supabase SQL editor for your factory project

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null default '',
  domain text not null default '',
  country text not null default 'US',
  language text not null default 'en',
  status text not null default 'setup' check (status in ('setup', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  logo_url text,
  primary_color text not null default '#f97316',
  font_preset text not null default 'modern',
  tagline text not null default '',

  meta_description text not null default '',
  author_name text not null default '',
  target_audience text not null default '',
  site_category text not null default '',

  content_tone text not null default 'informative' check (content_tone in ('casual', 'informative', 'quick')),
  prompt_overrides jsonb,
  ga_id text,

  sheet_url text not null default '',
  sheet_keyword_column text not null default 'A',
  sheet_restaurant_column text not null default 'B',
  sheet_status_column text not null default 'C',

  recipes_per_day integer not null default 5,
  generation_time text not null default '09:00',
  auto_pause_on_empty boolean not null default true,

  skimlinks_id text,
  amazon_associate_id text,
  hellofresh_url text,
  adsense_publisher_id text,

  site_supabase_url text,
  site_supabase_anon_key text,
  site_supabase_service_key text,

  recipes_published integer not null default 0,
  keywords_remaining integer not null default 0,
  keywords_failed integer not null default 0,
  last_generation_at timestamptz,
  next_scheduled_at timestamptz
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  keyword text not null,
  restaurant_name text,
  title text not null,
  slug text not null,
  description text not null default '',
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  prep_time text not null default '',
  cook_time text not null default '',
  servings integer not null default 4,
  difficulty text not null default 'Medium',
  nutrition jsonb not null default '{}',
  seo_title text not null default '',
  seo_description text not null default '',
  focus_keywords jsonb not null default '[]',
  image_search_term text not null default '',
  image_url text,
  word_count integer not null default 0,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists keyword_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  keyword text not null,
  restaurant_name text,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  error_reason text,
  processed_at timestamptz not null default now()
);

create table if not exists generation_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  keywords_processed integer not null default 0,
  keywords_succeeded integer not null default 0,
  keywords_failed integer not null default 0,
  status text not null default 'running' check (status in ('running', 'completed', 'failed'))
);

create table if not exists restaurants (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  unique(project_id, slug)
);

create index idx_restaurants_project on restaurants(project_id);
create index idx_recipes_project on recipes(project_id);
create index idx_recipes_slug on recipes(slug);
create index idx_recipes_category on recipes(category);
create index idx_keyword_logs_project on keyword_logs(project_id);
create index idx_generation_logs_project on generation_logs(project_id);

-- Migration helpers for existing installations:
-- alter table projects add column if not exists prompt_overrides jsonb;
-- alter table projects add column if not exists ga_id text;
-- alter table recipes add column if not exists category text;


-- Per-Site Database Schema (run this in each site's Supabase project)
-- Kept here for reference. Deployed via the factory when creating a new project.

-- create table if not exists recipes ( ... same schema as above minus project_id ... );
-- create table if not exists categories (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   slug text not null unique,
--   description text,
--   recipe_count integer not null default 0
-- );
-- create table if not exists site_settings (
--   key text primary key,
--   value jsonb not null
-- );
