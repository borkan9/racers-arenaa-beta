// app/api/auth/callback/route.ts
//
// OAuth callback handler for Supabase Auth (Google, Discord, Magic Link).
// Supabase redirects here after the user authenticates with an OAuth provider.
// This route exchanges the temporary code for a real session, then redirects
// the user to their intended destination.
//
// Configure this URL in:
//   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
//   Add: http://localhost:3000/api/auth/callback
//   Add: https://yourdomain.com/api/auth/callback

import { NextRequest, NextResponse }   from "next/server";
import { createSupabaseServerClient }  from "@/lib/supabase/server";

// ─── CALLBACK HANDLER ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code        = searchParams.get("code");
  const redirectTo  = searchParams.get("redirectTo") ?? "/";
  const error       = searchParams.get("error");
  const errorDesc   = searchParams.get("error_description");

  // ── OAuth provider returned an error ─────────────────────────────────────
  if (error) {
    console.error("[auth/callback] Provider error:", error, errorDesc);
    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent(errorDesc ?? error)}`,
    );
  }

  // ── No code present — bad request ────────────────────────────────────────
  if (!code) {
    console.error("[auth/callback] No code received.");
    return NextResponse.redirect(
      `${origin}/auth/signin?error=missing_code`,
    );
  }

  // ── Exchange code for session ─────────────────────────────────────────────
  const supabase = createSupabaseServerClient();

  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    console.error("[auth/callback] Code exchange failed:", exchangeError);
    return NextResponse.redirect(
      `${origin}/auth/signin?error=exchange_failed`,
    );
  }

  // ── Upsert user row in public.users ───────────────────────────────────────
  // Ensures a profile row exists the first time a user signs in via OAuth.
  // Uses upsert with ignoreDuplicates so repeat sign-ins are a no-op.
  const { user } = data.session;

  const { error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        id:       user.id,
        username: user.user_metadata?.full_name
          ?? user.email?.split("@")[0]
          ?? null,
        avatar:   user.user_metadata?.avatar_url ?? null,
        bio:      null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (upsertError) {
    // Non-fatal — user can still use the app, profile just may be missing.
    console.warn("[auth/callback] Profile upsert warning:", upsertError.message);
  }

  // ── Sanitise redirect destination ─────────────────────────────────────────
  // Only allow relative paths to prevent open-redirect attacks.
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  console.log(
    `[auth/callback] Session created for ${user.email}. Redirecting to ${safeRedirect}`,
  );

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}