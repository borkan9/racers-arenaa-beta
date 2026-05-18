// lib/supabase/server.ts
//
// Server-side Supabase client.
// Use this in:
//   - API Route handlers  (app/api/**/route.ts)
//   - Server Components   (any page.tsx without "use client")
//   - Server Actions
//
// Never import this in a "use client" component.
// For client components, use lib/supabase/client.ts instead.

import { createServerClient } from "@supabase/ssr";
import { cookies }            from "next/headers";
import type { Database }      from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

// Re-export a typed client alias so callers don't need to import Database too.
export type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

// ─── FACTORY FUNCTION ─────────────────────────────────────────────────────────

/**
 * Creates a new Supabase server client for the current request.
 *
 * Must be called inside a Server Component, API route, or Server Action
 * where Next.js cookies() is available.
 *
 * A new instance is created per call because cookies are request-scoped.
 * Do not instantiate this at module level.
 *
 * @example
 * // Inside an API route handler:
 * const supabase = createSupabaseServerClient();
 * const { data, error } = await supabase.from("users").select("*");
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Read a single cookie by name.
         * Called by Supabase to retrieve the stored session token.
         */
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        /**
         * Write one or more cookies.
         * Called by Supabase after a session refresh to persist the new token.
         *
         * In API routes this works directly.
         * In Server Components this will log a warning if called — that is
         * expected and safe; session refresh is handled by middleware instead.
         */
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored — middleware.ts handles session refresh.
          }
        },

        /**
         * Delete a cookie by name.
         * Called by Supabase on sign-out.
         */
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as set — safe to ignore in Server Components.
          }
        },
      },
    },
  );
}