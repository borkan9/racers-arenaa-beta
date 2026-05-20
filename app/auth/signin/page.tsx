// app/auth/signin/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { createClient }               from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { C, FONT }                    from "@/lib/constants";

type Provider = "google" | "discord";

type SignInState =
  | { status: "idle"    }
  | { status: "loading"; provider: Provider }
  | { status: "error";   message: string    }
  | { status: "success"                     };

export default function SignInPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/";
  const errorParam   = searchParams.get("error");

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

  const handleOAuth = async (provider: Provider) => {
    setState({ status: "loading", provider });
    const supabase    = createClient();
    const callbackUrl =
      `${window.location.origin}/api/auth/callback` +
      `?redirectTo=${encodeURIComponent(redirectTo)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt:      "select_account",
        },
      },
    });

    if (error) {
      console.error(`[signin] ${provider} OAuth error:`, error.message);
      setState({ status: "error", message: error.message });
    }
  };

  const isLoading  = (p: Provider) => state.status === "loading" && state.provider === p;
  const anyLoading = state.status === "loading";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0,rgba(255,255,255,0.02) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px", pointerEvents: "none" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center" }}>
          <div className="display" style={{ fontSize: 36, letterSpacing: 6, color: C.text, lineHeight: 1 }}>
            RACERS<span style={{ color: C.accent }}>·</span>ARENA
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 10, color: C.muted, letterSpacing: 4, marginTop: 6 }}>
            NO BRAKES — NO MERCY
          </div>
        </div>

        {/* Card */}
        <div style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 14, color: C.muted, letterSpacing: 3, marginBottom: 6 }}>SIGN IN TO CONTINUE</div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.dim }}>Your session is secured by Supabase Auth</div>
          </div>

          {/* Error */}
          {state.status === "error" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${C.accent}12`, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "12px 14px" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ fontFamily: FONT.body, fontSize: 13, color: C.accent, flex: 1 }}>{state.message}</span>
              <button onClick={() => setState({ status: "idle" })} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Google */}
          <OAuthButton label="Continue with Google" loading={isLoading("google")} disabled={anyLoading} onClick={() => handleOAuth("google")}
            icon={<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
          />

          {/* Discord */}
          <OAuthButton label="Continue with Discord" loading={isLoading("discord")} disabled={anyLoading} onClick={() => handleOAuth("discord")}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, letterSpacing: 2 }}>SECURE LOGIN</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            By signing in you agree to race responsibly.<br />All runs are subject to anti-cheat review.
          </p>
        </div>

        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: C.muted, fontFamily: FONT.body, fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>
          ← BACK TO HOME
        </button>
      </div>
    </div>
  );
}

interface OAuthButtonProps {
  label:    string;
  icon:     React.ReactNode;
  loading:  boolean;
  disabled: boolean;
  onClick:  () => void;
}

function OAuthButton({ label, icon, loading, disabled, onClick }: OAuthButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 20px", background: hovered && !disabled ? C.surface : C.bg, border: `1px solid ${hovered && !disabled ? C.accent : C.border}`, borderRadius: 10, color: disabled ? C.muted : C.text, fontFamily: FONT.body, fontWeight: 700, fontSize: 14, letterSpacing: 1, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: disabled && !loading ? 0.5 : 1 }}>
      {loading ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin-slow 0.8s linear infinite" }}>
          <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="3" opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
        </svg>
      ) : icon}
      {loading ? "Redirecting…" : label}
    </button>
  );
}