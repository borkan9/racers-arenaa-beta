// middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
// Any route that starts with these prefixes requires an active session.

const PROTECTED_PREFIXES = [
  "/profile",
  "/race",
  "/history",
  "/leaderboard",
  "/explore",
  "/admin",
  "/api/profile",
  "/api/races",
  "/api/leaderboard",
  "/api/admin",
];

// ─── ADMIN-ONLY ROUTES ────────────────────────────────────────────────────────

const ADMIN_PREFIXES = [
  "/admin",
  "/api/admin",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  // Refresh session — must be called on every request to keep tokens alive
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ── Protected route: no session → redirect to sign-in ────────────────────
  if (isProtected(pathname) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/signin";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Admin route: session exists but role is not admin → 403 ──────────────
  if (isAdminRoute(pathname) && session) {
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!userRow || (userRow as { role?: string }).role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }
  }

  // ── Auth pages: already signed in → redirect to home ─────────────────────
  if (pathname.startsWith("/auth/signin") && session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// ─── MATCHER ──────────────────────────────────────────────────────────────────
// Tell Next.js which paths to run middleware on.
// Excludes static files, images, and Next.js internals.

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};