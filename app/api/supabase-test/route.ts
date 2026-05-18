// app/api/supabase-test/route.ts
//
// Exposes the connection test as a Next.js App Router API route.
// Runs only when explicitly called — never on page load.
//
// Usage:
//   Browser : http://localhost:3000/api/supabase-test
//   Terminal: curl http://localhost:3000/api/supabase-test
//
// Remove this file (and lib/supabase/testConnection.ts) when done testing.

import { NextResponse }              from "next/server";
import { runSupabaseConnectionTest } from "@/lib/supabase/testConnection";

// ─── GUARD: disable in production ────────────────────────────────────────────
//
// Even though this route is safe (idempotent, no destructive ops),
// there is no reason to expose it after your dev/staging phase.

const ENABLED_IN_ENV: string[] = ["development", "test", "preview"];

export async function GET(): Promise<NextResponse> {
  const env = process.env.NODE_ENV ?? "development";

  if (!ENABLED_IN_ENV.includes(env)) {
    return NextResponse.json(
      {
        success: false,
        message: "This test route is disabled in production.",
      },
      { status: 403 },
    );
  }

  // ── Run the test ──────────────────────────────────────────────────────────
  try {
    const result = await runSupabaseConnectionTest();

    const status = result.success ? 200 : 500;

    return NextResponse.json(result, { status });

  } catch (unexpected) {
    // Catch anything that slipped through (network down, bad env vars, etc.)
    console.error("[supabase-test] Unexpected error:", unexpected);

    return NextResponse.json(
      {
        success: false,
        stage:   "unknown",
        message: "An unexpected error occurred. Check server logs.",
        error:   String(unexpected),
      },
      { status: 500 },
    );
  }
}

// Block every other HTTP method cleanly
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
}