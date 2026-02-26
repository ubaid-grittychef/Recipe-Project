import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler-status";

export async function GET() {
  const status = getSchedulerStatus();
  return NextResponse.json(status);
}
