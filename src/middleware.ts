import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that never require auth
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/",
  "/access-required",
  "/api/auth/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and cron (cron protected by CRON_SECRET separately)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build a response we can mutate cookies on (required by @supabase/ssr)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — validates JWT signature server-side (getSession() does not)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Read role + subscription from JWT custom claims (zero extra DB call)
  const userRole = (user.app_metadata?.user_role ?? "user") as string;
  const subStatus = (user.app_metadata?.subscription_status ?? "inactive") as string;

  // Admin bypasses all subscription and route checks
  if (userRole === "admin") {
    return response;
  }

  // Block non-admins from /admin/* routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Non-admins need active subscription for dashboard access
  if (subStatus !== "active") {
    return NextResponse.redirect(new URL("/access-required", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
