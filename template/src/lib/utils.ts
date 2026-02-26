export function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const CATEGORY_EMOJIS: Record<string, string> = {
  pasta: "🍝",
  burgers: "🍔",
  chicken: "🍗",
  breakfast: "🍳",
  salads: "🥗",
  soups: "🍜",
  desserts: "🍰",
  seafood: "🦞",
  vegetarian: "🥦",
  pizza: "🍕",
  tacos: "🌮",
  sandwiches: "🥪",
  steaks: "🥩",
  sushi: "🍣",
  noodles: "🍜",
  vegan: "🌱",
  drinks: "🥤",
  appetizers: "🍢",
  bbq: "🍖",
  curry: "🍛",
};

export function getCategoryEmoji(name: string): string {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return "🍽️";
}
