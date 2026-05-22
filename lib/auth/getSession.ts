// lib/auth/getSession.ts

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Session, User }         from "@supabase/supabase-js";

export interface SessionResult {
  session: Session | null;
  user:    User    | null;
  error:   string  | null;
}

export async function getSession(): Promise<SessionResult> {
  try {
    const supabase = await createSupabaseServerClient();

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

export async function getAuthenticatedUserId(): Promise<string | null> {
  const { user } = await getSession();
  return user?.id ?? null;
}