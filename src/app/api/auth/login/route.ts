import { NextResponse } from "next/server";
import * as crypto from "crypto";

const SESSION_COOKIE = "factory_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function hashToken(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  const factoryPassword = process.env.FACTORY_PASSWORD;

  if (!factoryPassword) {
    return NextResponse.json(
      { error: "FACTORY_PASSWORD not configured" },
      { status: 500 }
    );
  }

  const { password } = await request.json();

  if (!password || password !== factoryPassword) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const token = hashToken(factoryPassword);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
