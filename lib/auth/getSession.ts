// lib/auth/getSession.ts

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User }                  from "@supabase/supabase-js";

export interface SessionResult {
  user:  User | null;
  error: string | null;
}

export async function getSession(): Promise<SessionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user, error: null };
  } catch (unexpected) {
    return { user: null, error: String(unexpected) };
  }
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const { user } = await getSession();
  return user?.id ?? null;
}