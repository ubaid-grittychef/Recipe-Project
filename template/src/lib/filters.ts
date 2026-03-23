import { Recipe, Ingredient } from "./types";

// Time range filter
export type TimeRange = "under15" | "15to30" | "30to60" | "over60";

export const TIME_RANGES: { key: TimeRange; label: string; min: number; max: number }[] = [
  { key: "under15", label: "Under 15 min", min: 0, max: 15 },
  { key: "15to30", label: "15-30 min", min: 15, max: 30 },
  { key: "30to60", label: "30-60 min", min: 30, max: 60 },
  { key: "over60", label: "1 hr+", min: 60, max: Infinity },
];

export function parseMins(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export function matchesTimeRange(recipe: Recipe, range: TimeRange): boolean {
  const mins = parseMins(recipe.total_time);
  if (mins === null) return false;
  const def = TIME_RANGES.find(r => r.key === range);
  if (!def) return false;
  return mins >= def.min && mins < def.max;
}

// Dietary labels
export const DIETARY_LABELS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Low-Carb"] as const;
export type DietaryLabel = typeof DIETARY_LABELS[number];

const MEAT_KEYWORDS = ["chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham", "steak", "meatball", "ground meat", "veal", "duck"];
const FISH_KEYWORDS = ["fish", "salmon", "tuna", "shrimp", "prawn", "crab", "lobster", "seafood", "anchovy", "cod", "tilapia"];
const DAIRY_KEYWORDS = ["milk", "cheese", "cream", "butter", "yogurt", "whey", "casein"];
const GLUTEN_KEYWORDS = ["flour", "bread", "pasta", "wheat", "noodle", "tortilla", "cracker", "breadcrumb"];

function getIngredientNames(recipe: Recipe): string[] {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) return [];
  return recipe.ingredients.map((i: Ingredient) => (i.name || "").toLowerCase());
}

function getAllText(recipe: Recipe): string {
  const parts = [
    recipe.keyword || "",
    recipe.category || "",
    recipe.title || "",
    ...(recipe.focus_keywords || []),
    ...getIngredientNames(recipe),
  ];
  return parts.join(" ").toLowerCase();
}

export function deriveDietaryLabels(recipe: Recipe): DietaryLabel[] {
  const labels: DietaryLabel[] = [];
  const text = getAllText(recipe);
  const ingredients = getIngredientNames(recipe);

  const hasMeat = MEAT_KEYWORDS.some(k => ingredients.some(i => i.includes(k)));
  const hasFish = FISH_KEYWORDS.some(k => ingredients.some(i => i.includes(k)));
  const hasDairy = DAIRY_KEYWORDS.some(k => ingredients.some(i => i.includes(k)));
  const hasGluten = GLUTEN_KEYWORDS.some(k => ingredients.some(i => i.includes(k)));

  if (!hasMeat && !hasFish) labels.push("Vegetarian");
  if (!hasMeat && !hasFish && !hasDairy) labels.push("Vegan");
  if (!hasGluten) labels.push("Gluten-Free");
  if (!hasDairy) labels.push("Dairy-Free");

  // Keto: low carb indicators or explicit keyword
  if (text.includes("keto")) labels.push("Keto");
  if (text.includes("low-carb") || text.includes("low carb")) labels.push("Low-Carb");

  // Check nutrition for keto/low-carb
  const nutrition = recipe.nutrition as unknown as Record<string, unknown>;
  if (nutrition?.carbs) {
    const carbNum = parseInt(String(nutrition.carbs));
    if (!isNaN(carbNum) && carbNum < 20) {
      if (!labels.includes("Keto")) labels.push("Keto");
      if (!labels.includes("Low-Carb")) labels.push("Low-Carb");
    }
  }

  return labels;
}

// Cuisine detection
export const CUISINES = ["Italian", "Mexican", "American", "Asian", "Japanese", "Chinese", "Indian", "Thai", "French", "Mediterranean", "Korean", "Greek", "Middle Eastern", "Spanish"] as const;
export type Cuisine = typeof CUISINES[number];

const CUISINE_KEYWORDS: Record<string, Cuisine> = {
  pasta: "Italian", pizza: "Italian", risotto: "Italian", lasagna: "Italian", "italian": "Italian", bruschetta: "Italian", pesto: "Italian",
  taco: "Mexican", burrito: "Mexican", enchilada: "Mexican", quesadilla: "Mexican", salsa: "Mexican", mexican: "Mexican", guacamole: "Mexican",
  burger: "American", "mac and cheese": "American", bbq: "American", "fried chicken": "American", american: "American",
  sushi: "Japanese", ramen: "Japanese", teriyaki: "Japanese", tempura: "Japanese", japanese: "Japanese", miso: "Japanese",
  "stir fry": "Chinese", "fried rice": "Chinese", dumpling: "Chinese", chinese: "Chinese", wonton: "Chinese",
  curry: "Indian", tikka: "Indian", masala: "Indian", naan: "Indian", indian: "Indian", biryani: "Indian", tandoori: "Indian",
  "pad thai": "Thai", thai: "Thai", "green curry": "Thai", "tom yum": "Thai",
  croissant: "French", french: "French", crepe: "French", souffle: "French",
  hummus: "Mediterranean", falafel: "Mediterranean", mediterranean: "Mediterranean", greek: "Greek", tzatziki: "Greek",
  kimchi: "Korean", bibimbap: "Korean", korean: "Korean", bulgogi: "Korean",
  "middle eastern": "Middle Eastern", shawarma: "Middle Eastern", kebab: "Middle Eastern",
  paella: "Spanish", tapas: "Spanish", spanish: "Spanish", churro: "Spanish",
  asian: "Asian",
};

export function deriveCuisine(recipe: Recipe): Cuisine | null {
  const text = getAllText(recipe);
  for (const [keyword, cuisine] of Object.entries(CUISINE_KEYWORDS)) {
    if (text.includes(keyword)) return cuisine;
  }
  return null;
}
