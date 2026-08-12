// app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (error) {
    console.error("[auth/callback] Provider error:", error, errorDesc);
    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent(errorDesc ?? error)}`,
    );
  }

  if (!code) {
    console.error("[auth/callback] No code received.");
    return NextResponse.redirect(`${origin}/auth/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    console.error("[auth/callback] Code exchange failed:", exchangeError);
    return NextResponse.redirect(`${origin}/auth/signin?error=exchange_failed`);
  }

  const { user } = data.session;
  const emailPrefix = user.email?.split("@")[0] ?? "racer";
  const normalizedBase = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 23) || "racer";
  const fallbackUsername = `${normalizedBase}_${user.id.replaceAll("-", "").slice(0, 6)}`.slice(0, 30);
  const avatar = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  // The auth.users trigger normally creates this row. This admin upsert is a
  // server-only repair path for legacy/missing profiles and never grants the
  // browser direct write access to public.users.
  const rawClient = supabaseAdmin as unknown as { from: (table: string) => any };
  const { error: upsertError } = await rawClient
    .from("users")
    .upsert(
      { id: user.id, username: fallbackUsername, avatar, bio: null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (upsertError) {
    console.warn("[auth/callback] Profile fallback warning:", upsertError.message);
  }

  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  console.log(
    `[auth/callback] Session created for ${user.email}. Redirecting to ${safeRedirect}`,
  );

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}
