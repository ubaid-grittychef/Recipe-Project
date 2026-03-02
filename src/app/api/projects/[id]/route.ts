import { NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";
import { UpdateProjectSchema } from "@/lib/validation";

const log = createLogger("API:Project");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    log.error("GET /api/projects/[id] failed", {}, error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const raw = await request.json();
    const parsed = UpdateProjectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    log.info("Updating project", { id, fields: Object.keys(parsed.data) });
    const project = await updateProject(id, parsed.data);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    log.error("PUT /api/projects/[id] failed", {}, error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    log.info("Deleting project", { id });
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/projects/[id] failed", {}, error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
