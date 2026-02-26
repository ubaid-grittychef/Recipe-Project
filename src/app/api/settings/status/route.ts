import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler-status";

export async function GET() {
  const googleEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;
  const status = {
    openai: !!process.env.OPENAI_API_KEY,
    google: !!(googleEmail && process.env.GOOGLE_PRIVATE_KEY),
    google_email: googleEmail,
    factory_db: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    vercel: !!process.env.VERCEL_TOKEN,
    pexels: !!process.env.PEXELS_API_KEY,
    auth: !!process.env.FACTORY_PASSWORD,
    scheduler: getSchedulerStatus(),
  };

  return NextResponse.json(status);
}
