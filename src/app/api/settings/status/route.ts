import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = {
    openai: !!process.env.OPENAI_API_KEY,
    google: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
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
