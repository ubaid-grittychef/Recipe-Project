import { NextRequest, NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:BulkProjects");

export async function POST(req: NextRequest) {
  try {
    const { ids, action } = (await req.json()) as {
      ids: string[];
      action: "pause" | "resume" | "delete";
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }
    if (!["pause", "resume", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let updated = 0;
    for (const id of ids) {
      try {
        if (action === "delete") {
          await deleteProject(id);
        } else {
          await updateProject(id, { status: action === "pause" ? "paused" : "active" });
        }
        updated++;
      } catch (err) {
        log.error("Bulk action failed for project", { projectId: id, action }, err);
      }
    }

    const verb = action === "delete" ? "deleted" : action === "pause" ? "paused" : "activated";
    return NextResponse.json({
      updated,
      message: `${updated} project${updated !== 1 ? "s" : ""} ${verb}`,
    });
  } catch (error) {
    log.error("Bulk operation failed", {}, error);
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 500 });
  }
}
