import { getProject } from "@/lib/store";
import { getRecipesByProject } from "@/lib/store";
import { getBuiltInKeywords } from "@/lib/store";
import { notFound } from "next/navigation";
import ProjectDashboard from "@/components/projects/ProjectDashboard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const [recipes, keywords] = await Promise.all([
    getRecipesByProject(id),
    getBuiltInKeywords(id),
  ]);

  const draftCount = recipes.filter((r) => r.status === "draft").length;
  const queueCounts = {
    pending: keywords.filter((k) => k.status === "pending").length,
    done: keywords.filter((k) => k.status === "done").length,
    failed: keywords.filter((k) => k.status === "failed").length,
  };

  return (
    <ProjectDashboard
      id={id}
      project={project}
      initialDraftCount={draftCount}
      initialQueueCounts={queueCounts}
      initialRecipes={recipes}
    />
  );
}
