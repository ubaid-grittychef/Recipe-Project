import { NextResponse } from "next/server";
import { getGenerationLogs } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Logs");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const logs = await getGenerationLogs(id);
    return NextResponse.json(logs);
  } catch (error) {
    log.error("Failed to fetch generation logs", { projectId: id }, error);
    return NextResponse.json(
      { error: "Failed to fetch generation logs" },
      { status: 500 }
    );
  }
}
