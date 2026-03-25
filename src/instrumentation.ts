export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables on startup
    validateEnvironment();

    // Start scheduler
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}

function validateEnvironment() {
  const missing: { critical: string[]; warning: string[]; info: string[] } = {
    critical: [],
    warning: [],
    info: [],
  };

  // CRITICAL — core features broken without these
  if (!process.env.OPENAI_API_KEY)
    missing.critical.push("OPENAI_API_KEY — generation will not work");

  // WARNING — degraded functionality
  if (!process.env.PEXELS_API_KEY)
    missing.warning.push("PEXELS_API_KEY — recipe images will fail");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    missing.warning.push(
      "NEXT_PUBLIC_SUPABASE_URL — using in-memory store (data resets on restart)"
    );
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    missing.warning.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY — using in-memory store"
    );
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.warning.push(
      "SUPABASE_SERVICE_ROLE_KEY — using in-memory store"
    );
  if (!process.env.FACTORY_PASSWORD)
    missing.warning.push(
      "FACTORY_PASSWORD — no authentication, dashboard is publicly accessible"
    );

  // INFO — optional features disabled
  if (!process.env.VERCEL_TOKEN)
    missing.info.push("VERCEL_TOKEN — deployment feature disabled");
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    missing.info.push(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL — Google Sheets integration disabled"
    );
  if (!process.env.GOOGLE_PRIVATE_KEY)
    missing.info.push(
      "GOOGLE_PRIVATE_KEY — Google Sheets integration disabled"
    );

  const total =
    missing.critical.length + missing.warning.length + missing.info.length;

  if (total === 0) {
    console.log("[ENV] All environment variables configured");
    return;
  }

  console.log(
    `[ENV] ${total} environment variable(s) not set:`
  );

  if (missing.critical.length > 0) {
    for (const msg of missing.critical) {
      console.error(`[ENV] CRITICAL: ${msg}`);
    }
  }

  if (missing.warning.length > 0) {
    for (const msg of missing.warning) {
      console.warn(`[ENV] WARNING: ${msg}`);
    }
  }

  if (missing.info.length > 0) {
    for (const msg of missing.info) {
      console.log(`[ENV] INFO: ${msg}`);
    }
  }
}
