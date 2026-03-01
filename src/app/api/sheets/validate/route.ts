import { NextResponse } from "next/server";
import { validateSheet } from "@/lib/sheets";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Sheets");

export async function POST(request: Request) {
  try {
    const { sheet_url, keyword_col, restaurant_col, status_col } =
      await request.json();

    if (!sheet_url) {
      return NextResponse.json(
        { error: "Sheet URL is required" },
        { status: 400 }
      );
    }

    const result = await validateSheet(
      sheet_url,
      keyword_col ?? "A",
      restaurant_col ?? "B",
      status_col ?? "C"
    );

    return NextResponse.json(result);
  } catch (error) {
    log.error("Sheet validation error", {}, error);
    return NextResponse.json(
      {
        valid: false,
        preview: [],
        error: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 500 }
    );
  }
}
