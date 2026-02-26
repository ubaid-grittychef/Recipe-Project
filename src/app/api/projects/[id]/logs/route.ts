import { NextResponse } from "next/server";
import { getGenerationLogs } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await getGenerationLogs(id);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch generation logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation logs" },
      { status: 500 }
    );
  }
}
