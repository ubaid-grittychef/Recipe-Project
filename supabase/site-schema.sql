-- Per-Site Database Schema
-- Run this in each site's own Supabase project
-- The factory app creates a new Supabase project for each website

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  restaurant_name text,
  title text not null,
  slug text not null unique,
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
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_recipes_slug on recipes(slug);
create index idx_recipes_status on recipes(status);
create index idx_recipes_restaurant on recipes(restaurant_name);
create index idx_recipes_published on recipes(published_at desc);
