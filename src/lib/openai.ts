import OpenAI from "openai";
import { ContentTone, Ingredient, NutritionInfo, FAQ, Project } from "./types";
import { createLogger } from "./logger";

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

export interface GeneratedRecipe {
  title: string;
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
  category: string;
}

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

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: 4000,
  });

  const elapsed = Date.now() - startTime;
  const usage = response.usage;

  log.info("OpenAI response received", {
    keyword,
    elapsed_ms: elapsed,
    prompt_tokens: usage?.prompt_tokens,
    completion_tokens: usage?.completion_tokens,
    total_tokens: usage?.total_tokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    log.error("Empty response from OpenAI", {
      keyword,
      finish_reason: response.choices[0]?.finish_reason,
    });
    throw new Error("Empty response from OpenAI");
  }

  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: GeneratedRecipe;
  try {
    parsed = JSON.parse(cleaned) as GeneratedRecipe;
  } catch (parseErr) {
    log.error(
      "Failed to parse OpenAI JSON response",
      { keyword, responsePreview: cleaned.slice(0, 200) },
      parseErr
    );
    throw new Error(`Failed to parse recipe JSON for "${keyword}"`);
  }

  if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
    log.error("Invalid recipe structure from OpenAI", {
      keyword,
      hasTitle: !!parsed.title,
      hasIngredients: !!parsed.ingredients,
      hasInstructions: !!parsed.instructions,
    });
    throw new Error(
      `Invalid recipe structure returned from OpenAI for "${keyword}"`
    );
  }

  parsed.intro_content = parsed.intro_content || parsed.description;
  parsed.tips = parsed.tips || [];
  parsed.variations = parsed.variations || [];
  parsed.faqs = parsed.faqs || [];
  parsed.total_time = parsed.total_time || parsed.cook_time;
  parsed.rating = parsed.rating || 4.8;
  parsed.category = parsed.category || "";

  log.info("Recipe generated successfully", {
    keyword,
    title: parsed.title,
    wordCount: parsed.intro_content.split(/\s+/).length,
    faqCount: parsed.faqs.length,
    tipCount: parsed.tips.length,
  });

  return parsed;
}
