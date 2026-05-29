// lib/supabase/server.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies }                                  from "next/headers";
import type { Database }                            from "@/types/database.types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const allCookies  = cookieStore.getAll();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    },
  );
}