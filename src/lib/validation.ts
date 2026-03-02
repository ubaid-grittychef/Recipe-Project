/**
 * Shared Zod schemas for API request validation.
 * Import the relevant schema in each route and call .safeParse() on request bodies.
 */
import { z } from "zod";

// ── Project ─────────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "name is required").max(120),
  niche: z.string().max(200).optional().default(""),
  domain: z.string().max(253).optional().default(""),
  country: z.string().max(10).optional().default("US"),
  language: z.string().max(10).optional().default("en"),
  status: z.enum(["setup", "active", "paused"]).optional().default("setup"),
  logo_url: z.string().url().or(z.literal("")).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#f97316"),
  font_preset: z.string().max(60).optional().default("modern"),
  tagline: z.string().max(300).optional().default(""),
  meta_description: z.string().max(300).optional().default(""),
  author_name: z.string().max(100).optional().default(""),
  target_audience: z.string().max(200).optional().default(""),
  site_category: z.string().max(100).optional().default(""),
  content_tone: z.enum(["casual", "informative", "quick"]).optional().default("casual"),
  prompt_overrides: z.object({
    system_context: z.string().optional(),
    intro: z.string().optional(),
    tips: z.string().optional(),
    faq: z.string().optional(),
    variations: z.string().optional(),
    seo: z.string().optional(),
  }).nullable().optional(),
  sheet_url: z.string().max(2000).optional().default(""),
  sheet_keyword_column: z.string().max(5).optional().default("A"),
  sheet_restaurant_column: z.string().max(5).optional().default("B"),
  sheet_status_column: z.string().max(5).optional().default("C"),
  recipes_per_day: z.number().int().min(1).max(500).optional().default(5),
  generation_time: z.string().regex(/^\d{2}:\d{2}$/, "must be HH:MM").optional().default("08:00"),
  auto_pause_on_empty: z.boolean().optional().default(true),
  skimlinks_id: z.string().max(50).nullable().optional(),
  amazon_associate_id: z.string().max(50).nullable().optional(),
  hellofresh_url: z.string().url().or(z.literal("")).nullable().optional(),
  adsense_publisher_id: z.string().max(50).nullable().optional(),
  ga_id: z.string().max(50).nullable().optional(),
  site_supabase_url: z.string().url().or(z.literal("")).nullable().optional(),
  site_supabase_anon_key: z.string().max(500).nullable().optional(),
  site_supabase_service_key: z.string().max(500).nullable().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// ── Recipe ───────────────────────────────────────────────────────────────────

const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.string(),
  unit: z.string(),
  affiliate_url: z.string().url().optional(),
});

const NutritionSchema = z.object({
  calories: z.number().int().min(0),
  protein: z.string(),
  carbs: z.string(),
  fat: z.string(),
  fiber: z.string(),
  sodium: z.string(),
});

const FAQSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

// Only the fields a user is allowed to update via PUT /recipes/[id]
export const UpdateRecipeSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(5000).optional(),
  intro_content: z.string().max(50000).optional(),
  ingredients: z.array(IngredientSchema).optional(),
  instructions: z.array(z.string()).optional(),
  prep_time: z.string().max(50).optional(),
  cook_time: z.string().max(50).optional(),
  total_time: z.string().max(50).optional(),
  servings: z.number().int().min(1).max(1000).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  nutrition: NutritionSchema.optional(),
  tips: z.array(z.string()).optional(),
  variations: z.array(z.string()).optional(),
  faqs: z.array(FAQSchema).optional(),
  rating: z.number().min(1).max(5).optional(),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(165).optional(),
  focus_keywords: z.array(z.string()).optional(),
  image_url: z.string().url().or(z.literal("")).nullable().optional(),
  image_search_term: z.string().max(300).optional(),
  // Status transitions are allowed but validated further in route logic
  status: z.enum(["draft", "published"]).optional(),
  category: z.string().max(100).nullable().optional(),
  // published_at is set/cleared by the route based on status transition
  published_at: z.string().nullable().optional(),
});

// ── Bulk publish ─────────────────────────────────────────────────────────────

export const BulkPublishSchema = z.object({
  /** Optional list of recipe IDs. If omitted, all drafts are published. */
  recipeIds: z.array(z.string().uuid()).optional(),
});

// ── Sheets validate ──────────────────────────────────────────────────────────

const GOOGLE_SHEETS_URL_RE =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[-\w]+/;

export const ValidateSheetSchema = z.object({
  sheet_url: z
    .string()
    .min(1, "sheet_url is required")
    .regex(GOOGLE_SHEETS_URL_RE, "Must be a valid Google Sheets URL (https://docs.google.com/spreadsheets/d/...)"),
  keyword_col: z.string().max(5).optional(),
  restaurant_col: z.string().max(5).optional(),
  status_col: z.string().max(5).optional(),
});

// ── Restaurant ───────────────────────────────────────────────────────────────

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  slug: z.string().max(200).regex(/^[a-z0-9-]*$/, "slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().max(2000).nullable().optional(),
  logo_url: z.string().url().or(z.literal("")).nullable().optional(),
  website_url: z.string().url().or(z.literal("")).nullable().optional(),
});

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();
