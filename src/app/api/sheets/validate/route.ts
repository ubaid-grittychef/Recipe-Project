import { NextResponse } from "next/server";
import { validateSheet } from "@/lib/sheets";
import { createLogger } from "@/lib/logger";
import { ValidateSheetSchema } from "@/lib/validation";

const log = createLogger("API:Sheets");

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ValidateSheetSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          preview: [],
          error:
            parsed.error.flatten().fieldErrors.sheet_url?.[0] ??
            "Validation failed",
        },
        { status: 400 }
      );
    }

    const { sheet_url, keyword_col, restaurant_col, status_col } = parsed.data;

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
