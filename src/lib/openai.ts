import OpenAI from "openai";
import { z } from "zod";
import { ContentTone, Project } from "./types";
import { createLogger } from "./logger";
import { withRetry } from "./utils";

const log = createLogger("OpenAI");

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. Configure it in .env.local"
      );
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ── Zod schema for OpenAI response validation ─────────────────────────────────
// Validates the structure AND coerces types (e.g. servings as string → number)
// before the recipe is stored. Fields not in the schema are stripped.

const IngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.union([z.string(), z.number()]).transform(String),
  unit: z.union([z.string(), z.number()]).transform(String),
});

const NutritionSchema = z.object({
  calories: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
  protein: z.union([z.string(), z.number()]).transform(String),
  carbs: z.union([z.string(), z.number()]).transform(String),
  fat: z.union([z.string(), z.number()]).transform(String),
  fiber: z.union([z.string(), z.number()]).transform(String),
  sodium: z.union([z.string(), z.number()]).transform(String),
});

const FAQSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const GeneratedRecipeSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  intro_content: z.string().optional().default(""),
  category: z.string().optional().default(""),
  ingredients: z.array(IngredientSchema).min(1),
  instructions: z.array(z.string()).min(1),
  prep_time: z.string().default(""),
  cook_time: z.string().default(""),
  total_time: z.string().default(""),
  // OpenAI sometimes returns servings as a string like "4 servings"
  servings: z.union([z.number(), z.string()]).transform((v) => {
    const n = parseInt(String(v), 10);
    return isNaN(n) || n < 1 ? 4 : n;
  }),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  nutrition: NutritionSchema.default({
    calories: 0, protein: "", carbs: "", fat: "", fiber: "", sodium: "",
  }),
  tips: z.array(z.string()).default([]),
  variations: z.array(z.string()).default([]),
  faqs: z.array(FAQSchema).default([]),
  // Clamp rating to valid range
  rating: z.number().min(1).max(5).default(4.8),
  seo_title: z.string().default(""),
  seo_description: z.string().default(""),
  focus_keywords: z.array(z.string()).default([]),
  image_search_term: z.string().default(""),
});

export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;

type PromptOverrides = NonNullable<Project["prompt_overrides"]>;

const toneInstructions: Record<ContentTone, string> = {
  casual:
    "Write in a friendly, fun, conversational tone. Use personality and enthusiasm. Address the reader directly. Feel like a friend sharing their favorite recipe.",
  informative:
    "Write in a thorough, knowledgeable tone. Include cooking tips, technique explanations, and ingredient background. Feel like a professional food writer.",
  quick:
    "Write in a concise, straight-to-the-point style. Minimal introduction. Focus on clarity and speed. No unnecessary filler.",
};

// Default prompt fragments — used when no project override is set
const DEFAULTS = {
  system_context: (siteCategory: string, targetAudience: string) =>
    `You are an expert SEO recipe writer for a ${siteCategory} website targeting ${targetAudience}.`,
  intro:
    'A 300-500 word introduction article section. Use 2-3 subheadings wrapped in **double asterisks** (e.g. **Why This Recipe Works**). Include the keyword 2-3 times naturally. Cover: the story behind the dish, what makes it special, key flavor notes, and why readers will love making it at home. This is the blog content that appears BEFORE the recipe card.',
  tips:
    '3-5 pro tips that help readers get the best results, e.g. ingredient substitutions, storage advice, common mistakes to avoid',
  faq:
    'Commonly searched question about this recipe (use natural language people would type into Google)',
  variations:
    "3-4 recipe variations, e.g. 'Make it spicy: add 1 tsp cayenne pepper', 'Vegetarian version: swap chicken for extra-firm tofu'",
  seo:
    'seo_title: 60-character max title tag with keyword near the front. seo_description: 155-character max meta description with keyword and a call to action.',
};

export async function generateRecipe(
  keyword: string,
  restaurantName: string | null,
  niche: string,
  tone: ContentTone,
  siteCategory: string,
  targetAudience: string,
  promptOverrides?: PromptOverrides | null
): Promise<GeneratedRecipe> {
  const overrides = promptOverrides ?? {};
  const restaurantContext = restaurantName
    ? `This is a copycat recipe inspired by ${restaurantName}'s version. Reference the restaurant naturally in the intro and description.`
    : "";

  log.info("Generating recipe", {
    keyword,
    restaurant: restaurantName,
    tone,
    hasOverrides: Object.keys(overrides).length > 0,
  });

  const systemCtx = overrides.system_context ?? DEFAULTS.system_context(siteCategory, targetAudience);
  const introInstructions = overrides.intro ?? DEFAULTS.intro;
  const tipsInstructions = overrides.tips ?? DEFAULTS.tips;
  const faqInstructions = overrides.faq ?? DEFAULTS.faq;
  const variationsInstructions = overrides.variations ?? DEFAULTS.variations;

  const prompt = `${systemCtx}

${toneInstructions[tone]}

Create a COMPLETE, SEO-OPTIMIZED recipe article for: "${keyword}"
${restaurantContext}
Niche: ${niche}

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):
{
  "title": "SEO-optimized H1 title (include the keyword naturally, 50-70 chars)",
  "description": "Engaging 100-150 word summary that includes the keyword, what makes this recipe special, and why readers should try it",
  "intro_content": "${introInstructions}",
  "category": "Single short category label for this recipe, e.g. Pasta, Burgers, Chicken, Breakfast, Salads, Soups, Desserts, Seafood, Vegetarian",
  "ingredients": [
    {"name": "ingredient name", "quantity": "amount", "unit": "unit of measure"}
  ],
  "instructions": ["Detailed step 1 with temperatures and timing", "Step 2..."],
  "prep_time": "e.g. 15 minutes",
  "cook_time": "e.g. 30 minutes",
  "total_time": "e.g. 45 minutes",
  "servings": 4,
  "difficulty": "Easy|Medium|Hard",
  "nutrition": {
    "calories": 350,
    "protein": "25g",
    "carbs": "30g",
    "fat": "15g",
    "fiber": "4g",
    "sodium": "500mg"
  },
  "tips": [
    "${tipsInstructions}"
  ],
  "variations": [
    "${variationsInstructions}"
  ],
  "faqs": [
    {"question": "${faqInstructions}", "answer": "Detailed 2-3 sentence answer that directly answers the question"},
    {"question": "Another FAQ", "answer": "Answer"}
  ],
  "rating": 4.8,
  "seo_title": "60-character max title tag with keyword near the front",
  "seo_description": "155-character max meta description with keyword and a call to action (e.g. 'Try this easy copycat...')",
  "focus_keywords": ["primary keyword", "4 more long-tail SEO keywords people actually search"],
  "image_search_term": "very specific photo description for stock image search, e.g. 'homemade big mac burger with special sauce on sesame bun close up'"
}

CRITICAL REQUIREMENTS:
- The FIRST SENTENCE of intro_content MUST naturally include the exact keyword phrase: "${keyword}"
- Include 8-15 ingredients with precise measurements
- Write 8-14 detailed instruction steps with specific temperatures, times, and visual cues
- Include exactly 4-6 FAQs that people would realistically search on Google about this recipe
- Include 3-5 actionable pro tips
- Include 3-4 variations
- intro_content must be 300-500 words with **bolded subheadings** for SEO structure
- Nutrition values must be realistic approximations
- SEO title must start with or prominently feature the main keyword
- Focus keywords must be real search terms with intent (not generic words)
- rating should be between 4.5 and 5.0 (realistic review score)
- total_time must equal prep_time + cook_time
- category must be a single short label (1-3 words max)${overrides.seo ? `\n- SEO guidance: ${overrides.seo}` : ""}`;

  const startTime = Date.now();

  const response = await withRetry(() =>
    getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 4000,
      response_format: { type: "json_object" },
    })
  );

  const elapsed = Date.now() - startTime;
  const usage = response.usage;

  // Warn if the response was cut off due to token limit
  const finishReason = response.choices[0]?.finish_reason;
  if (finishReason === "length") {
    log.warn("OpenAI response truncated by max_completion_tokens — output may be incomplete", {
      keyword,
      completion_tokens: usage?.completion_tokens,
    });
  }

  log.info("OpenAI response received", {
    keyword,
    elapsed_ms: elapsed,
    finish_reason: finishReason,
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    log.error("Empty response from OpenAI", { keyword, finish_reason: finishReason });
    throw new Error("Empty response from OpenAI");
  }

  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(cleaned);
  } catch (parseErr) {
    log.error(
      "Failed to parse OpenAI JSON response",
      { keyword, responsePreview: cleaned.slice(0, 200) },
      parseErr
    );
    throw new Error(`Failed to parse recipe JSON for "${keyword}"`);
  }

  // Validate and coerce with Zod schema
  const validated = GeneratedRecipeSchema.safeParse(rawParsed);
  if (!validated.success) {
    log.error("OpenAI response failed schema validation", {
      keyword,
      errors: validated.error.flatten().fieldErrors,
    });
    throw new Error(
      `Invalid recipe structure returned from OpenAI for "${keyword}": ${validated.error.message}`
    );
  }

  const parsed = validated.data;

  // Apply fallbacks for fields OpenAI sometimes omits
  if (!parsed.intro_content) parsed.intro_content = parsed.description;
  if (!parsed.total_time) parsed.total_time = parsed.cook_time;

  log.info("Recipe generated successfully", {
    keyword,
    title: parsed.title,
    wordCount: parsed.intro_content.split(/\s+/).length,
    faqCount: parsed.faqs.length,
    tipCount: parsed.tips.length,
  });

  return parsed;
}

/**
 * Lightweight content refresh — regenerates only intro_content and SEO fields
 * for an existing recipe. Much cheaper than a full regeneration (~400 tokens vs ~3000).
 */
export async function refreshRecipeContent(
  keyword: string,
  title: string,
  niche: string,
  tone: string,
  restaurantName?: string | null
): Promise<{ intro_content: string; seo_title: string; seo_description: string; focus_keywords: string[] }> {
  const restaurantCtx = restaurantName ? ` for ${restaurantName}` : "";

  const prompt = `You are a professional food blogger writing fresh, engaging content.

Rewrite the intro section and SEO metadata for this recipe:
Title: "${title}"
Keyword: "${keyword}"${restaurantCtx}
Niche: ${niche}
Tone: ${tone}

Return ONLY this JSON object (no markdown, no code fences):
{
  "intro_content": "Fresh 300-400 word introduction with **bolded subheadings** covering what makes this dish special, its origin/backstory, and why this version is the best. Use a friendly, engaging ${tone} tone.",
  "seo_title": "60-character max SEO title tag starting with the main keyword",
  "seo_description": "155-character max meta description with keyword and a clear call to action",
  "focus_keywords": ["primary keyword", "4 related long-tail SEO keywords"]
}`;

  const response = await withRetry(() =>
    getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content.trim()) as {
    intro_content: string;
    seo_title: string;
    seo_description: string;
    focus_keywords: string[];
  };

  if (!parsed.intro_content || !parsed.seo_title || !parsed.seo_description) {
    throw new Error("Incomplete refresh response from OpenAI");
  }

  return parsed;
}
