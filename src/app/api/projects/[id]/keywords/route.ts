import { NextResponse } from "next/server";
import { getKeywordLogs } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await getKeywordLogs(id);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch keyword logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch keyword logs" },
      { status: 500 }
    );
  }
}
