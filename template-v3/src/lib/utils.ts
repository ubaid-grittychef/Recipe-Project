import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const CATEGORY_EMOJIS: Record<string, string> = {
  pasta: "🍝", burgers: "🍔", chicken: "🍗", breakfast: "🍳",
  salads: "🥗", soups: "🍜", desserts: "🍰", seafood: "🦞",
  vegetarian: "🥦", pizza: "🍕", tacos: "🌮", sandwiches: "🥪",
  steaks: "🥩", sushi: "🍣", noodles: "🍜", vegan: "🌱",
  drinks: "🥤", appetizers: "🍢", bbq: "🍖", curry: "🍛",
};

export function getCategoryEmoji(name: string): string {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return "🍽️";
}

const GRADIENTS = [
  "from-orange-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-pink-400 to-rose-400",
  "from-lime-400 to-emerald-500",
  "from-cyan-400 to-sky-500",
];

export function getCategoryGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}
