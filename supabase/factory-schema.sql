-- Factory Dashboard Database Schema
-- Run this in the Supabase SQL editor for your factory project
-- Safe to re-run: uses IF NOT EXISTS throughout

-- ── Projects ─────────────────────────────────────────────────────────────────

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

  -- Branding
  logo_url text,
  primary_color text not null default '#f97316',
  font_preset text not null default 'modern',
  tagline text not null default '',

  -- SEO
  meta_description text not null default '',
  author_name text not null default '',
  target_audience text not null default '',
  site_category text not null default '',

  -- AI
  content_tone text not null default 'informative' check (content_tone in ('casual', 'informative', 'quick')),
  prompt_overrides jsonb,

  -- Google Sheet
  sheet_url text not null default '',
  sheet_keyword_column text not null default 'A',
  sheet_restaurant_column text not null default 'B',
  sheet_status_column text not null default 'C',

  -- Schedule
  recipes_per_day integer not null default 5,
  generation_time text not null default '09:00',
  auto_pause_on_empty boolean not null default true,

  -- Monetization
  skimlinks_id text,
  amazon_associate_id text,
  hellofresh_url text,
  adsense_publisher_id text,
  ga_id text,

  -- Site Supabase
  site_supabase_url text,
  site_supabase_anon_key text,
  site_supabase_service_key text,

  -- Deployment
  vercel_token text,
  vercel_project_id text,
  vercel_deployment_url text,
  deployment_status text not null default 'not_deployed',
  template_variant text not null default 'default',

  -- Stats
  recipes_published integer not null default 0,
  keywords_remaining integer not null default 0,
  keywords_failed integer not null default 0,
  last_generation_at timestamptz,
  next_scheduled_at timestamptz,
  generation_status text not null default 'idle'
);

-- ── Restaurants (must be before recipes for FK reference) ────────────────────

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  unique(project_id, slug)
);

-- ── Categories (must be before recipes for FK reference) ─────────────────────

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  recipe_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(project_id, slug)
);

-- ── Recipes ───────────────────────────────────────────────────────────────────

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  keyword text not null default '',
  restaurant_name text,
  restaurant_id uuid references restaurants(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  slug text not null,
  description text not null default '',
  intro_content text not null default '',
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  prep_time text not null default '',
  cook_time text not null default '',
  total_time text not null default '',
  servings integer not null default 4,
  difficulty text not null default 'Medium',
  nutrition jsonb not null default '{}',
  tips jsonb not null default '[]',
  variations jsonb not null default '[]',
  faqs jsonb not null default '[]',
  rating numeric(2,1) not null default 4.8,
  seo_title text not null default '',
  seo_description text not null default '',
  focus_keywords jsonb not null default '[]',
  image_search_term text not null default '',
  image_url text,
  word_count integer not null default 0,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(project_id, slug)
);

-- ── Keyword Logs ─────────────────────────────────────────────────────────────

create table if not exists keyword_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  keyword text not null,
  restaurant_name text,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  error_reason text,
  processed_at timestamptz not null default now()
);

-- ── Generation Logs ───────────────────────────────────────────────────────────

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

-- ── Deployments ───────────────────────────────────────────────────────────────

create table if not exists deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  vercel_deployment_id text,
  vercel_project_id text,
  url text,
  domain text,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  env_vars jsonb not null default '{}'
);

-- ── Built-in Keyword Queue ────────────────────────────────────────────────────

create table if not exists builtin_keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  keyword text not null,
  restaurant_name text,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  error_reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists idx_recipes_project on recipes(project_id);
create index if not exists idx_recipes_status on recipes(status);
create index if not exists idx_recipes_created on recipes(created_at desc);
create index if not exists idx_recipes_slug on recipes(slug);
create index if not exists idx_recipes_category on recipes(category);
create index if not exists idx_keyword_logs_project on keyword_logs(project_id);
create index if not exists idx_generation_logs_project on generation_logs(project_id);
create index if not exists idx_deployments_project on deployments(project_id);
create index if not exists idx_restaurants_project on restaurants(project_id);
create index if not exists idx_categories_project on categories(project_id);
create index if not exists idx_builtin_keywords_project_status on builtin_keywords(project_id, status);
create index if not exists idx_builtin_keywords_created_at on builtin_keywords(created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table projects enable row level security;
alter table recipes enable row level security;
alter table keyword_logs enable row level security;
alter table generation_logs enable row level security;
alter table deployments enable row level security;
alter table restaurants enable row level security;
alter table categories enable row level security;
alter table builtin_keywords enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'projects' and policyname = 'Service role only') then
    create policy "Service role only" on projects using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Service role only') then
    create policy "Service role only" on recipes using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'keyword_logs' and policyname = 'Service role only') then
    create policy "Service role only" on keyword_logs using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'generation_logs' and policyname = 'Service role only') then
    create policy "Service role only" on generation_logs using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'deployments' and policyname = 'Service role only') then
    create policy "Service role only" on deployments using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'restaurants' and policyname = 'Service role only') then
    create policy "Service role only" on restaurants using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'Service role only') then
    create policy "Service role only" on categories using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'builtin_keywords' and policyname = 'Service role only') then
    create policy "Service role only" on builtin_keywords using (auth.role() = 'service_role');
  end if;
end $$;

-- ── Helper functions ──────────────────────────────────────────────────────────

create or replace function increment_category_count(cat_id uuid)
returns void language sql security definer as $$
  update categories set recipe_count = recipe_count + 1 where id = cat_id;
$$;

-- ============================================================
-- PROFILES (Supabase Auth users extension)
-- ============================================================

create table if not exists profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  full_name            text not null default '',
  role                 text not null default 'user' check (role in ('admin', 'user')),
  subscription_status  text not null default 'inactive' check (subscription_status in ('active', 'inactive')),
  stripe_customer_id   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_subscription_status()
returns text as $$
  select subscription_status from profiles where id = auth.uid();
$$ language sql security definer stable;

alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can read own profile') then
    create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Admins can read all profiles') then
    create policy "Admins can read all profiles" on profiles for select using (get_my_role() = 'admin');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Admins can update all profiles') then
    create policy "Admins can update all profiles" on profiles for update using (get_my_role() = 'admin') with check (get_my_role() = 'admin');
  end if;
end $$;

alter table projects add column if not exists user_id uuid references profiles(id);

alter table projects enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'projects' and policyname = 'Users see own projects') then
    create policy "Users see own projects" on projects for all using (user_id = auth.uid() or get_my_role() = 'admin');
  end if;
end $$;

-- JWT Custom Claims Hook
-- Register in: Supabase Dashboard → Auth → Hooks → Custom Access Token Hook
create or replace function custom_jwt_claims(event jsonb)
returns jsonb as $$
declare
  profile_row profiles;
begin
  select * into profile_row from profiles where id = (event->>'user_id')::uuid;
  return jsonb_set(
    event, '{claims}',
    (event->'claims') || jsonb_build_object(
      'user_role', coalesce(profile_row.role, 'user'),
      'subscription_status', coalesce(profile_row.subscription_status, 'inactive')
    )
  );
end;
$$ language plpgsql security definer;
