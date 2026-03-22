import { getProject, getGenerationLogs, getKeywordLogs, getRecipesByProject } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import AnalyticsClient from "@/components/projects/AnalyticsClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const [genLogs, kwLogs, recipes] = await Promise.all([
    getGenerationLogs(id),
    getKeywordLogs(id),
    getRecipesByProject(id),
  ]);

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <BarChart3 className="h-5 w-5 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <AnalyticsClient genLogs={genLogs} kwLogs={kwLogs} recipes={recipes} />
    </div>
  );
}
