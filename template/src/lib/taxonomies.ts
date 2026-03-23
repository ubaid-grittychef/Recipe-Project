import { Recipe } from "./types";

export interface Taxonomy {
  slug: string;
  name: string;
  emoji: string;
}

// Cuisine mappings
const CUISINE_KEYWORDS: Record<string, string> = {
  // Italian
  pasta: "Italian", pizza: "Italian", risotto: "Italian", lasagna: "Italian", italian: "Italian", pesto: "Italian", bruschetta: "Italian", gnocchi: "Italian",
  // Mexican
  taco: "Mexican", burrito: "Mexican", enchilada: "Mexican", quesadilla: "Mexican", mexican: "Mexican", guacamole: "Mexican", salsa: "Mexican",
  // American
  burger: "American", bbq: "American", american: "American", "mac and cheese": "American", cornbread: "American",
  // Japanese
  sushi: "Japanese", ramen: "Japanese", teriyaki: "Japanese", tempura: "Japanese", japanese: "Japanese", miso: "Japanese",
  // Chinese
  "stir fry": "Chinese", "fried rice": "Chinese", dumpling: "Chinese", chinese: "Chinese", wonton: "Chinese",
  // Indian
  curry: "Indian", tikka: "Indian", masala: "Indian", naan: "Indian", indian: "Indian", biryani: "Indian", tandoori: "Indian",
  // Thai
  "pad thai": "Thai", thai: "Thai", "green curry": "Thai", "tom yum": "Thai",
  // French
  croissant: "French", french: "French", crepe: "French", souffle: "French", quiche: "French",
  // Mediterranean
  hummus: "Mediterranean", falafel: "Mediterranean", mediterranean: "Mediterranean", tahini: "Mediterranean",
  // Greek
  greek: "Greek", tzatziki: "Greek", moussaka: "Greek", souvlaki: "Greek",
  // Korean
  kimchi: "Korean", bibimbap: "Korean", korean: "Korean", bulgogi: "Korean",
  // Middle Eastern
  "middle eastern": "Middle Eastern", shawarma: "Middle Eastern", kebab: "Middle Eastern",
  // Spanish
  paella: "Spanish", tapas: "Spanish", spanish: "Spanish", churro: "Spanish",
};

const CUISINE_EMOJIS: Record<string, string> = {
  Italian: "\uD83C\uDDEE\uD83C\uDDF9", Mexican: "\uD83C\uDDF2\uD83C\uDDFD", American: "\uD83C\uDDFA\uD83C\uDDF8", Japanese: "\uD83C\uDDEF\uD83C\uDDF5", Chinese: "\uD83C\uDDE8\uD83C\uDDF3",
  Indian: "\uD83C\uDDEE\uD83C\uDDF3", Thai: "\uD83C\uDDF9\uD83C\uDDED", French: "\uD83C\uDDEB\uD83C\uDDF7", Mediterranean: "\uD83E\uDED2", Greek: "\uD83C\uDDEC\uD83C\uDDF7",
  Korean: "\uD83C\uDDF0\uD83C\uDDF7", "Middle Eastern": "\uD83E\uDDC6", Spanish: "\uD83C\uDDEA\uD83C\uDDF8",
};

// Meal type mappings
const MEAL_KEYWORDS: Record<string, string> = {
  breakfast: "Breakfast", brunch: "Breakfast", pancake: "Breakfast", waffle: "Breakfast", omelette: "Breakfast", eggs: "Breakfast", toast: "Breakfast", cereal: "Breakfast", smoothie: "Breakfast",
  lunch: "Lunch", sandwich: "Lunch", wrap: "Lunch", salad: "Lunch", soup: "Lunch",
  dinner: "Dinner", steak: "Dinner", roast: "Dinner", casserole: "Dinner",
  dessert: "Dessert", cake: "Dessert", cookie: "Dessert", pie: "Dessert", brownie: "Dessert", "ice cream": "Dessert", pudding: "Dessert", chocolate: "Dessert",
  snack: "Snack", dip: "Snack", chips: "Snack", popcorn: "Snack", "trail mix": "Snack",
  appetizer: "Appetizer", starter: "Appetizer",
  "side dish": "Side Dish", side: "Side Dish", "mashed potato": "Side Dish", coleslaw: "Side Dish",
  drink: "Drink", cocktail: "Drink", lemonade: "Drink", juice: "Drink",
};

const MEAL_EMOJIS: Record<string, string> = {
  Breakfast: "\uD83C\uDF73", Lunch: "\uD83E\uDD6A", Dinner: "\uD83C\uDF7D\uFE0F", Dessert: "\uD83C\uDF70",
  Snack: "\uD83C\uDF7F", Appetizer: "\uD83E\uDD5F", "Side Dish": "\uD83E\uDD57", Drink: "\uD83E\uDD64",
};

function getRecipeText(recipe: Recipe): string {
  const parts = [
    recipe.keyword || "",
    recipe.category || "",
    recipe.title || "",
    ...(Array.isArray(recipe.focus_keywords) ? recipe.focus_keywords : []),
  ];
  return parts.join(" ").toLowerCase();
}

export function classifyByCuisine(recipe: Recipe): string | null {
  const text = getRecipeText(recipe);
  for (const [keyword, cuisine] of Object.entries(CUISINE_KEYWORDS)) {
    if (text.includes(keyword)) return cuisine;
  }
  return null;
}

export function classifyByMealType(recipe: Recipe): string | null {
  const text = getRecipeText(recipe);
  for (const [keyword, mealType] of Object.entries(MEAL_KEYWORDS)) {
    if (text.includes(keyword)) return mealType;
  }
  return null;
}

export function getCuisines(recipes: Recipe[]): Taxonomy[] {
  const counts = new Map<string, number>();
  recipes.forEach(r => {
    const cuisine = classifyByCuisine(r);
    if (cuisine) counts.set(cuisine, (counts.get(cuisine) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => ({
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      emoji: CUISINE_EMOJIS[name] || "\uD83C\uDF74",
    }));
}

export function getMealTypes(recipes: Recipe[]): Taxonomy[] {
  const counts = new Map<string, number>();
  recipes.forEach(r => {
    const meal = classifyByMealType(r);
    if (meal) counts.set(meal, (counts.get(meal) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => ({
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      emoji: MEAL_EMOJIS[name] || "\uD83C\uDF7D\uFE0F",
    }));
}

export function getRecipesByCuisine(recipes: Recipe[], cuisineName: string): Recipe[] {
  return recipes.filter(r => classifyByCuisine(r) === cuisineName);
}

export function getRecipesByMealType(recipes: Recipe[], mealTypeName: string): Recipe[] {
  return recipes.filter(r => classifyByMealType(r) === mealTypeName);
}
