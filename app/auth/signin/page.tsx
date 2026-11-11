// app/auth/signin/page.tsx

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { createClient }                          from "@/lib/supabase/client";
import { useRouter, useSearchParams }            from "next/navigation";
import { C, FONT }                               from "@/lib/constants";
import { SignInView, type SignInProvider }        from "@/components/SignInView";

// ─── INNER COMPONENT (uses useSearchParams) ───────────────────────────────────

function SignInContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/";
  const errorParam   = searchParams.get("error");

  type SignInState =
    | { status: "idle" }
    | { status: "loading"; provider: SignInProvider }
    | { status: "error"; message: string }
    | { status: "success" };

  const [state, setState] = useState<SignInState>(
    errorParam
      ? { status: "error", message: decodeURIComponent(errorParam) }
      : { status: "idle" },
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirectTo);
    });
  }, [redirectTo, router]);

  const handleOAuth = async (provider: Exclude<SignInProvider, "guest">) => {
    setState({ status: "loading", provider });
    const supabase    = createClient();
    const callbackUrl =
      `${window.location.origin}/api/auth/callback` +
      `?redirectTo=${encodeURIComponent(redirectTo)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    if (error) {
      setState({ status: "error", message: error.message });
    }
  };

  const handleGuestSignIn = async () => {
    setState({ status: "loading", provider: "guest" });
    window.sessionStorage.setItem("redline:guestMode", "true");
    router.replace(redirectTo);
  };

  return (
    <SignInView
      logoSrc="/redline-logo.jpg"
      onGuest={handleGuestSignIn}
      onGoogle={() => { void handleOAuth("google"); }}
      onDiscord={() => { void handleOAuth("discord"); }}
      onBack={() => router.push("/")}
      loading={state.status === "loading" ? state.provider : null}
      error={state.status === "error" ? state.message : null}
      onDismissError={() => setState({ status: "idle" })}
    />
  );
}

// ─── PAGE EXPORT (wrapped in Suspense) ────────────────────────────────────────

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, animation: "spin-slow 0.8s linear infinite" }} />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
