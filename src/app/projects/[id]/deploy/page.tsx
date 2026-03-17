import { getProject, getDeployments } from "@/lib/store";
import { notFound } from "next/navigation";
import DeployClient from "./DeployClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeployPage({ params }: Props) {
  const { id } = await params;

  const [project, deployments] = await Promise.all([
    getProject(id),
    getDeployments(id),
  ]);

  if (!project) notFound();

  const hasVercelToken = !!process.env.VERCEL_TOKEN;

  return (
    <DeployClient
      id={id}
      initialProject={project}
      initialDeployments={deployments}
      hasVercelToken={hasVercelToken}
    />
  );
}
