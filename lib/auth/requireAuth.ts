// lib/auth/requireAuth.ts

import { NextResponse }  from "next/server";
import { getSession }    from "@/lib/auth/getSession";
import type { User }     from "@supabase/supabase-js";

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