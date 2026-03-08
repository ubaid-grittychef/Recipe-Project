import { NextResponse } from "next/server";
import { deleteBuiltInKeyword } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Queue");

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; kwId: string }> }
) {
  const { id, kwId } = await params;
  try {
    await deleteBuiltInKeyword(kwId);
    log.info("Deleted keyword from queue", { projectId: id, kwId });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to delete keyword", { kwId }, error);
    return NextResponse.json({ error: "Failed to delete keyword" }, { status: 500 });
  }
}
