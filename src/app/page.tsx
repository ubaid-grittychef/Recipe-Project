import { getProjects } from "@/lib/store";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const projects = await getProjects();
  return <DashboardClient initialProjects={projects} />;
}
