// lib/auth/requireAuth.ts
//
// Hard authentication guard for API routes.
// Call at the top of any route handler that requires a logged-in user.
// Returns the authenticated user or throws a pre-built 401 NextResponse.

import { NextResponse }              from "next/server";
import { getSession }                from "@/lib/auth/getSession";
import type { User }                 from "@supabase/supabase-js";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AuthGuardSuccess {
  ok:       true;
  user:     User;
  userId:   string;
}

export interface AuthGuardFailure {
  ok:       false;
  response: NextResponse;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

// ─── REQUIRE AUTH ─────────────────────────────────────────────────────────────

/**
 * Verifies the request has a valid session.
 * Use the discriminated union to branch safely in route handlers.
 *
 * @example
 * const guard = await requireAuth();
 * if (!guard.ok) return guard.response;
 * const { userId } = guard;
 */
export async function requireAuth(): Promise<AuthGuardResult> {
  const { user, error } = await getSession();

  if (error || !user) {
    return {
      ok:       false,
      response: NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      ),
    };
  }

  return {
    ok:     true,
    user,
    userId: user.id,
  };
}

// ─── REQUIRE ADMIN ────────────────────────────────────────────────────────────

/**
 * Verifies the request has a valid session AND the user has role = "admin".
 * Reads role directly from the users table — never trusts client claims.
 *
 * @example
 * const guard = await requireAdmin();
 * if (!guard.ok) return guard.response;
 */
export async function requireAdmin(): Promise<AuthGuardResult> {
  const authGuard = await requireAuth();
  if (!authGuard.ok) return authGuard;

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", authGuard.userId)
    .single();

  const role = (data as { role?: string } | null)?.role;

  if (error || role !== "admin") {
    return {
      ok:       false,
      response: NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 },
      ),
    };
  }

  return authGuard;
}