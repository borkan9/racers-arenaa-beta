// lib/auth/getSession.ts
//
// Safe server-side session reader.
// Use this in API routes and Server Components to get the current user.
// Never trust the client to send the user id — always read it from the session.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Session, User } from "@supabase/supabase-js";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SessionResult {
  session: Session | null;
  user:    User    | null;
  error:   string  | null;
}

// ─── GET SESSION ──────────────────────────────────────────────────────────────

/**
 * Reads the current session from cookies on the server.
 * Returns { session, user, error } — never throws.
 *
 * @example
 * const { user, error } = await getSession();
 * if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const supabase = createSupabaseServerClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return { session: null, user: null, error: error.message };
    }

    return {
      session,
      user:  session?.user ?? null,
      error: null,
    };
  } catch (unexpected) {
    return {
      session: null,
      user:    null,
      error:   String(unexpected),
    };
  }
}

// ─── GET USER ID ──────────────────────────────────────────────────────────────

/**
 * Convenience helper — returns only the authenticated user's id.
 * Returns null if no session exists.
 *
 * @example
 * const userId = await getAuthenticatedUserId();
 * if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const { user } = await getSession();
  return user?.id ?? null;
}