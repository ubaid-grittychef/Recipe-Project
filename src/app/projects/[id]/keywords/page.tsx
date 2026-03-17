import { getKeywordLogs, getProject } from "@/lib/store";
import KeywordsClient from "./KeywordsClient";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KeywordsPage({ params }: Props) {
  const { id } = await params;
  const [logs, project] = await Promise.all([getKeywordLogs(id), getProject(id)]);

  return (
    <div>
      <Breadcrumbs items={[
        { label: "All Projects", href: "/" },
        { label: project?.name ?? "Project", href: `/projects/${id}` },
        { label: "Keywords" },
      ]} />
      <KeywordsClient id={id} initialLogs={logs} />
    </div>
  );
}
