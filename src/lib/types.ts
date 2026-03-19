export type ProjectStatus = "setup" | "active" | "paused";
export type ContentTone = "casual" | "informative" | "quick";
export type KeywordStatus = "pending" | "done" | "failed";
export type DeploymentStatus = "not_deployed" | "deploying" | "deployed" | "failed";

// ── Auth / Profiles ──────────────────────────────────────────────────────────
export type UserRole = "admin" | "user";
export type SubscriptionStatus = "active" | "inactive";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: "free" | "pro";
  current_period_end: string | null;
  monthly_recipe_quota: number;
  recipes_generated_this_month: number;
  quota_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  niche: string;
  domain: string;
  country: string;
  language: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;

  // Branding
  logo_url: string | null;
  primary_color: string;
  font_preset: string;
  tagline: string;

  // SEO
  meta_description: string;
  author_name: string;
  target_audience: string;
  site_category: string;

  // AI
  content_tone: ContentTone;

  // Prompt Overrides (per-project custom instructions for each recipe section)
  prompt_overrides: {
    system_context?: string;
    intro?: string;
    tips?: string;
    faq?: string;
    variations?: string;
    seo?: string;
  } | null;

  // Google Sheet
  sheet_url: string;
  sheet_keyword_column: string;
  sheet_restaurant_column: string;
  sheet_status_column: string;

  // Schedule (legacy — kept for backward compat, no longer drives automation)
  recipes_per_day: number;
  generation_time: string;
  auto_pause_on_empty: boolean;

  // Publish Schedule
  publish_schedule_enabled: boolean;
  publish_time: string;           // "HH:MM"
  publish_per_day: number;        // 1–20, default 3
  publish_days: string;           // JSON array string: "[1,2,3,4,5]" Mon=1…Sun=7
  next_publish_at: string | null;
  last_published_at: string | null;

  // Monetization
  skimlinks_id: string | null;
  amazon_associate_id: string | null;
  hellofresh_url: string | null;
  adsense_publisher_id: string | null;
  ga_id: string | null;

  // Site Supabase
  site_supabase_url: string | null;
  site_supabase_anon_key: string | null;
  site_supabase_service_key: string | null;

  // Template
  template_variant: "default" | "premium" | "v3";

  // Deployment
  vercel_token: string | null;
  vercel_project_id: string | null;
  vercel_deployment_url: string | null;
  deployment_status: DeploymentStatus;

  // Stats (denormalized for dashboard)
  recipes_published: number;
  keywords_remaining: number;
  keywords_failed: number;
  last_generation_at: string | null;
  next_scheduled_at: string | null;
  draft_count?: number;
  generation_status: "idle" | "running" | "completed" | "failed";
}

export interface Category {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  recipe_count: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  project_id: string;
  keyword: string;
  restaurant_name: string | null;
  restaurant_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  intro_content: string;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: number;
  difficulty: string;
  nutrition: NutritionInfo;
  tips: string[];
  variations: string[];
  faqs: FAQ[];
  rating: number;
  seo_title: string;
  seo_description: string;
  focus_keywords: string[];
  image_search_term: string;
  image_url: string | null;
  word_count: number;
  category: string | null;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  affiliate_url?: string;
}

export interface NutritionInfo {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
}

export interface KeywordLog {
  id: string;
  project_id: string;
  keyword: string;
  restaurant_name: string | null;
  status: KeywordStatus;
  error_reason: string | null;
  processed_at: string;
}

export interface GenerationLog {
  id: string;
  project_id: string;
  started_at: string;
  completed_at: string | null;
  keywords_processed: number;
  keywords_succeeded: number;
  keywords_failed: number;
  status: "running" | "completed" | "failed";
}

export interface BuiltInKeyword {
  id: string;
  project_id: string;
  keyword: string;
  restaurant_name: string | null;
  status: "pending" | "done" | "failed";
  error_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Restaurant {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  vercel_deployment_id: string | null;
  vercel_project_id: string | null;
  url: string | null;
  domain: string | null;
  status: "queued" | "building" | "ready" | "error" | "canceled";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  env_vars: Record<string, string>;
}

export interface WizardFormData {
  // Step 1
  name: string;
  niche: string;
  restaurant_category: string;
  domain: string;
  country: string;
  language: string;

  // Step 2
  sheet_url: string;
  sheet_keyword_column: string;
  sheet_restaurant_column: string;
  sheet_status_column: string;

  // Step 3
  logo_url: string;
  primary_color: string;
  font_preset: string;
  tagline: string;

  // Step 4
  meta_description: string;
  author_name: string;
  target_audience: string;
  site_category: string;

  // Step 5
  content_tone: ContentTone;

  // Step 6
  recipes_per_day: number;
  generation_time: string;
  auto_pause_on_empty: boolean;

  // Step 7
  skimlinks_id: string;
  amazon_associate_id: string;
  hellofresh_url: string;
  adsense_publisher_id: string;
  ga_id: string;

  // Template
  template_variant: "default" | "premium" | "v3";
}

export const FONT_PRESETS = [
  { id: "modern", name: "Modern Clean", fonts: "Inter + DM Sans" },
  { id: "classic", name: "Classic Elegant", fonts: "Playfair Display + Lora" },
  { id: "bold", name: "Bold & Fun", fonts: "Poppins + Nunito" },
  { id: "minimal", name: "Minimal Sharp", fonts: "Space Grotesk + IBM Plex Sans" },
  { id: "warm", name: "Warm & Cozy", fonts: "Merriweather + Source Sans Pro" },
] as const;

export const TONE_OPTIONS = [
  {
    id: "casual" as const,
    name: "Casual & Fun",
    description: "Friendly, conversational tone with personality. Great for lifestyle recipe blogs.",
    example: "OMG, this copycat Nando's Peri-Peri chicken is going to blow your mind!",
  },
  {
    id: "informative" as const,
    name: "Informative & Detailed",
    description: "Thorough, knowledgeable tone with tips and explanations. Best for authority sites.",
    example: "This recipe recreates Nando's signature Peri-Peri chicken using a traditional blend of African Bird's Eye chillies.",
  },
  {
    id: "quick" as const,
    name: "Quick & Simple",
    description: "Straight to the point. Minimal fluff. Perfect for search-focused sites.",
    example: "Copycat Nando's Peri-Peri Chicken — ready in 45 minutes with 8 simple ingredients.",
  },
] as const;

export const COLOR_PRESETS = [
  "#f97316", "#ef4444", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4",
];
