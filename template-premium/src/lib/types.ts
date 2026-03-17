export interface Recipe {
  id: string;
  keyword: string;
  restaurant_name: string | null;
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

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface NutritionInfo {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
}

export interface FAQ {
  question: string;
  answer: string;
}
