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

/** Parse quantity string to number: "1", "1.5", "1/2", "1 1/2" */
export function parseQuantity(str: string): number | null {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);

  // Fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);

  // Decimal or integer
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/** Format number back to readable quantity: 0.5 -> "1/2", 1.5 -> "1 1/2" */
export function formatQuantity(num: number): string {
  if (num === 0) return "0";

  const whole = Math.floor(num);
  const decimal = num - whole;

  // Common fraction lookup (within tolerance)
  const fractions: [number, string][] = [
    [1/8, "1/8"], [1/4, "1/4"], [1/3, "1/3"], [3/8, "3/8"],
    [1/2, "1/2"], [5/8, "5/8"], [2/3, "2/3"], [3/4, "3/4"],
    [7/8, "7/8"],
  ];

  if (decimal < 0.05) return whole.toString();

  for (const [val, str] of fractions) {
    if (Math.abs(decimal - val) < 0.05) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Fallback: round to 1 decimal
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}
