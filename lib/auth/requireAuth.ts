// lib/auth/requireAuth.ts

import { NextResponse } from "next/server";
import { getSession }   from "@/lib/auth/getSession";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { User }    from "@supabase/supabase-js";

export interface AuthGuardSuccess {
  ok:        true;
  user:      User;
  userId:    string;
  response?: never;
}

export interface AuthGuardFailure {
  ok:       false;
  response: NextResponse;
  user?:    never;
  userId?:  never;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth/requireAuth] Failed to verify account status:", profileError.message);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unable to verify account status." },
        { status: 500 },
      ),
    };
  }

  if (profile?.role === "suspended") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Account suspended." },
        { status: 403 },
      ),
    };
  }

  return {
    ok:     true,
    user,
    userId: user.id,
  };
}

export async function requireAdmin(): Promise<AuthGuardResult> {
  const authGuard = await requireAuth();
  if (!authGuard.ok) return authGuard;

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await (supabase as any)
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
