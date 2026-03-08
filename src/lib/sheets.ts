import { auth, sheets } from "@googleapis/sheets";
import { createLogger } from "./logger";
import { withRetry } from "./utils";

const log = createLogger("Sheets");

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Google Sheets not configured — add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to .env.local, then restart the server."
    );
  }
  return new auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return sheets({ version: "v4", auth: getAuth() });
}

function extractSheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    log.error("Invalid Google Sheet URL", { url });
    throw new Error("Invalid Google Sheet URL — could not extract sheet ID");
  }
  return match[1];
}

function columnToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

function indexToColumn(idx: number): string {
  let col = "";
  let n = idx + 1;
  while (n > 0) {
    n--;
    col = String.fromCharCode(65 + (n % 26)) + col;
    n = Math.floor(n / 26);
  }
  return col;
}

export interface SheetKeyword {
  row: number;
  keyword: string;
  restaurant: string;
  status: string;
}

export interface PendingKeywordsResult {
  keywords: SheetKeyword[];
  totalPending: number;
}

export async function fetchPendingKeywords(
  sheetUrl: string,
  keywordCol: string,
  restaurantCol: string,
  statusCol: string,
  limit?: number
): Promise<PendingKeywordsResult> {
  const client = getSheetsClient();
  const spreadsheetId = extractSheetId(sheetUrl);

  const colIndices = [
    { name: "keyword", col: keywordCol, idx: columnToIndex(keywordCol) },
    { name: "restaurant", col: restaurantCol, idx: columnToIndex(restaurantCol) },
    { name: "status", col: statusCol, idx: columnToIndex(statusCol) },
  ];

  const minCol = Math.min(...colIndices.map((c) => c.idx));
  const maxCol = Math.max(...colIndices.map((c) => c.idx));

  const startColLetter = indexToColumn(minCol);
  const endColLetter = indexToColumn(maxCol);
  const range = `${startColLetter}:${endColLetter}`;

  log.debug("Fetching sheet data", { spreadsheetId, range });

  const res = await withRetry(() =>
    client.spreadsheets.values.get({ spreadsheetId, range })
  );

  const rows = res.data.values ?? [];

  const kIdx = colIndices.find((c) => c.name === "keyword")!.idx - minCol;
  const rIdx = colIndices.find((c) => c.name === "restaurant")!.idx - minCol;
  const sIdx = colIndices.find((c) => c.name === "status")!.idx - minCol;

  // Collect ALL pending keywords first (for accurate remaining count)
  const allPending: SheetKeyword[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[sIdx] ?? "").toString().toLowerCase().trim();
    if (status === "pending" || status === "") {
      const keyword = (row[kIdx] ?? "").toString().trim();
      if (!keyword) continue;
      allPending.push({
        row: i + 1,
        keyword,
        restaurant: (row[rIdx] ?? "").toString().trim(),
        status,
      });
    }
  }

  const totalPending = allPending.length;
  const keywords = limit ? allPending.slice(0, limit) : allPending;

  log.info("Found pending keywords", { batch: keywords.length, totalPending, total: rows.length - 1 });
  return { keywords, totalPending };
}

export async function markKeywordDone(
  sheetUrl: string,
  statusCol: string,
  row: number,
  status: "done" | "failed",
  errorReason?: string
) {
  const client = getSheetsClient();
  const spreadsheetId = extractSheetId(sheetUrl);

  const timestamp = new Date().toISOString();
  const value =
    status === "done" ? `done - ${timestamp}` : `failed - ${errorReason ?? "unknown"}`;

  log.debug("Marking keyword in sheet", { row, status, col: statusCol });

  await withRetry(() =>
    client.spreadsheets.values.update({
      spreadsheetId,
      range: `${statusCol}${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [[value]] },
    })
  );
}

/**
 * Reset specific sheet rows back to pending status so they can be re-tried.
 * @param rows  1-based row numbers to reset (from KeywordLog.row — not available
 *              in the factory DB, so we re-scan the sheet and match by keyword text)
 * @param keywords  The keyword strings to match and reset
 */
export async function resetKeywordsToPending(
  sheetUrl: string,
  keywordCol: string,
  statusCol: string,
  keywords: string[]
): Promise<{ reset: number }> {
  if (keywords.length === 0) return { reset: 0 };

  const client = getSheetsClient();
  const spreadsheetId = extractSheetId(sheetUrl);

  const minIdx = Math.min(columnToIndex(keywordCol), columnToIndex(statusCol));
  const maxIdx = Math.max(columnToIndex(keywordCol), columnToIndex(statusCol));
  const range = `${indexToColumn(minIdx)}:${indexToColumn(maxIdx)}`;

  const res = await withRetry(() =>
    client.spreadsheets.values.get({ spreadsheetId, range })
  );
  const rows = res.data.values ?? [];
  const kOffset = columnToIndex(keywordCol) - minIdx;
  const sOffset = columnToIndex(statusCol) - minIdx;

  const keywordSet = new Set(keywords.map((k) => k.trim().toLowerCase()));
  const updates: Array<Promise<unknown>> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const kw = (row[kOffset] ?? "").toString().trim().toLowerCase();
    const status = (row[sOffset] ?? "").toString().toLowerCase().trim();
    // Only reset rows that are currently failed
    if (keywordSet.has(kw) && status.startsWith("failed")) {
      const rowNumber = i + 1;
      updates.push(
        withRetry(() =>
          client.spreadsheets.values.update({
            spreadsheetId,
            range: `${statusCol}${rowNumber}`,
            valueInputOption: "RAW",
            requestBody: { values: [[""]] },
          })
        )
      );
    }
  }

  await Promise.all(updates);
  log.info("Reset keywords to pending in sheet", { count: updates.length });
  return { reset: updates.length };
}

/**
 * Append new keyword rows to the sheet.
 * Each row is written to the keyword and restaurant columns; status column is left blank (= "pending").
 */
export async function appendKeywordsToSheet(
  sheetUrl: string,
  keywordCol: string,
  restaurantCol: string,
  statusCol: string,
  keywords: Array<{ keyword: string; restaurant: string }>
): Promise<{ appended: number }> {
  if (keywords.length === 0) return { appended: 0 };

  const client = getSheetsClient();
  const spreadsheetId = extractSheetId(sheetUrl);

  const kIdx = columnToIndex(keywordCol);
  const rIdx = columnToIndex(restaurantCol);
  const sIdx = columnToIndex(statusCol);

  // Find the first empty row by reading the keyword column
  const res = await withRetry(() =>
    client.spreadsheets.values.get({ spreadsheetId, range: `${keywordCol}:${keywordCol}` })
  );
  const existingRows = res.data.values ?? [];
  // Next empty row (1-based, skip header row 1)
  const startRow = Math.max(existingRows.length + 1, 2);

  // Build the minimal column span needed
  const minIdx = Math.min(kIdx, rIdx, sIdx);
  const maxIdx = Math.max(kIdx, rIdx, sIdx);
  const numCols = maxIdx - minIdx + 1;

  const rows = keywords.map(({ keyword, restaurant }) => {
    const row: string[] = Array(numCols).fill("");
    row[kIdx - minIdx] = keyword;
    row[rIdx - minIdx] = restaurant;
    row[sIdx - minIdx] = ""; // empty = pending
    return row;
  });

  const startColLetter = indexToColumn(minIdx);
  const endColLetter = indexToColumn(maxIdx);
  const range = `${startColLetter}${startRow}:${endColLetter}${startRow + rows.length - 1}`;

  await withRetry(() =>
    client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    })
  );

  log.info("Appended keywords to sheet", { count: rows.length, startRow });
  return { appended: rows.length };
}

export async function validateSheet(
  sheetUrl: string,
  keywordCol: string,
  restaurantCol: string,
  statusCol: string
): Promise<{ valid: boolean; preview: SheetKeyword[]; error?: string }> {
  try {
    log.info("Validating sheet connection", { sheetUrl: sheetUrl.slice(0, 60) });
    const { keywords } = await fetchPendingKeywords(
      sheetUrl,
      keywordCol,
      restaurantCol,
      statusCol,
      5
    );
    log.info("Sheet validation succeeded", { previewCount: keywords.length });
    return { valid: true, preview: keywords };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to connect to sheet";
    log.error("Sheet validation failed", { sheetUrl: sheetUrl.slice(0, 60) }, error);
    return { valid: false, preview: [], error: msg };
  }
}
