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

  // If on a public auth path, check if user is already logged in → redirect to dashboard
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // Only check auth for login/signup (not /auth/ callbacks or /access-required)
    if (pathname === "/login" || pathname === "/signup") {
      let checkResponse = NextResponse.next({ request });
      const checkSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              checkResponse = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => checkResponse.cookies.set(name, value, options));
            },
          },
        }
      );
      const { data: { user } } = await checkSupabase.auth.getUser();
      if (user) return NextResponse.redirect(new URL("/", request.url));
    }
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

  // Fetch role + subscription directly from profiles table (no JWT hook needed)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_status")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "user";
  const subStatus = profile?.subscription_status ?? "inactive";

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
