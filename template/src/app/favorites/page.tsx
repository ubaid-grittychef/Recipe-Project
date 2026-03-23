import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import FavoritesClient from "./FavoritesClient";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Saved Recipes | ${siteConfig.name}`,
  description: "Your saved and bookmarked recipes.",
};

export default async function FavoritesPage() {
  let recipes: Awaited<ReturnType<typeof getAllRecipes>> = [];
  try {
    recipes = await getAllRecipes();
  } catch {
    // Supabase unavailable — fall through with empty array
  }

  return <FavoritesClient allRecipes={recipes} />;
}
