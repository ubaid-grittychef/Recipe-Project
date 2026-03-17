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

const DARK_GRADIENTS = [
  "from-orange-600 to-rose-700",
  "from-amber-600 to-orange-700",
  "from-emerald-600 to-teal-700",
  "from-sky-600 to-blue-700",
  "from-violet-600 to-purple-700",
  "from-pink-600 to-rose-700",
  "from-lime-600 to-emerald-700",
  "from-cyan-600 to-sky-700",
];

export function getCategoryGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return DARK_GRADIENTS[hash % DARK_GRADIENTS.length];
}
