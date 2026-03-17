import Link from "next/link";
import Image from "next/image";
import type { Recipe } from "@/lib/types";

interface Props {
  recipe: Recipe;
  rank?: number;
}

function diffClass(difficulty: string) {
  const d = difficulty?.toLowerCase();
  if (d === "easy") return "badge-easy";
  if (d === "hard") return "badge-hard";
  return "badge-medium";
}

export default function RecipeCard({ recipe, rank }: Props) {
  const rankStr = rank !== undefined ? String(rank).padStart(2, "0") : null;

  return (
    <Link href={`/recipe/${recipe.slug}`} className="sweep-top block bg-white group">
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-bg-2 border-b border-rule">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={`${recipe.title} recipe`}
            fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-4 text-4xl select-none">
            🍽️
          </div>
        )}

        {/* Rank number */}
        {rankStr && (
          <span className="absolute bottom-2 left-2 font-serif text-[28px] font-black text-white/80 leading-none drop-shadow-md select-none">
            {rankStr}
          </span>
        )}

        {/* Difficulty badge */}
        {recipe.difficulty && (
          <span className={`absolute top-2 right-2 ${diffClass(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {recipe.category && (
          <p className="sec-eyebrow mb-1.5">{recipe.category}</p>
        )}
        <h3 className="font-serif text-[15px] font-bold text-ink leading-[1.3] tracking-[-0.2px] mb-2.5 group-hover:text-red transition-colors line-clamp-2">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-4">
          {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
          {recipe.rating != null && recipe.rating > 0 && (
            <span className="text-amber-600 font-bold">★ {recipe.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
