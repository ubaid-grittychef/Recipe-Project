import { getRecipesByProject, getProject } from "@/lib/store";
import RecipesClient from "./RecipesClient";

interface Props {
  params: Promise<{ id: string }>;
}

const PAGE_SIZE = 50;

export default async function RecipesPage({ params }: Props) {
  const { id } = await params;
  const [allRecipes, project] = await Promise.all([
    getRecipesByProject(id),
    getProject(id),
  ]);

  // Apply default sort (newest first) and paginate for initial render
  const sorted = [...allRecipes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const initialRecipes = sorted.slice(0, PAGE_SIZE);
  const initialTotal = allRecipes.length;

  return (
    <RecipesClient
      id={id}
      projectName={project?.name ?? "Project"}
      initialRecipes={initialRecipes}
      initialTotal={initialTotal}
    />
  );
}
