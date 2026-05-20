// app/api/auth/callback/route.ts

import { NextRequest, NextResponse }  from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const error      = searchParams.get("error");
  const errorDesc  = searchParams.get("error_description");

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

  const supabase = createSupabaseServerClient();

  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    console.error("[auth/callback] Code exchange failed:", exchangeError);
    return NextResponse.redirect(`${origin}/auth/signin?error=exchange_failed`);
  }

  const { user } = data.session;

  const username =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    null;

  const avatar =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;

  // Use type assertion to bypass Supabase generic inference issue
  const supabaseAny = supabase as unknown as {
    from: (table: string) => {
      upsert: (
        data: Record<string, unknown>,
        options: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };
  };

  const { error: upsertError } = await supabaseAny
    .from("users")
    .upsert(
      { id: user.id, username, avatar, bio: null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (upsertError) {
    console.warn("[auth/callback] Profile upsert warning:", upsertError.message);
  }

  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  console.log(
    `[auth/callback] Session created for ${user.email}. Redirecting to ${safeRedirect}`,
  );

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}