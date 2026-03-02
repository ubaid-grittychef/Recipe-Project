import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as crypto from "crypto";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];
const SESSION_COOKIE = "factory_session";

export function middleware(request: NextRequest) {
  const factoryPassword = process.env.FACTORY_PASSWORD;

  if (!factoryPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE);

  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const expectedToken = crypto
    .createHash("sha256")
    .update(factoryPassword)
    .digest("hex");

  if (session.value !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
