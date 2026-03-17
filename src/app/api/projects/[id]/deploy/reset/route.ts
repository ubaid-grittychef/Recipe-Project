import { NextResponse } from "next/server";
import { updateProject, getDeployments, updateDeployment } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:DeployReset");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Reset project deployment_status
    await updateProject(id, { deployment_status: "not_deployed" });

    // Mark any stuck "building"/"queued" deployments as "error"
    const deployments = await getDeployments(id);
    for (const dep of deployments) {
      if (dep.status === "building" || dep.status === "queued") {
        await updateDeployment(dep.id, {
          status: "error",
          error_message: "Cancelled by user",
          completed_at: new Date().toISOString(),
        });
      }
    }

    log.info("Deployment status reset", { projectId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to reset deployment", { projectId: id }, error);
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
}
