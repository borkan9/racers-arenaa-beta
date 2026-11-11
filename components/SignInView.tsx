"use client";

import React, { useState } from "react";
import { C, FONT } from "@/lib/constants";

export type SignInProvider = "guest" | "google" | "discord";

interface SignInViewProps {
  onGuest: () => void;
  onGoogle: () => void;
  onDiscord: () => void;
  onBack: () => void;
  loading: SignInProvider | null;
  error?: string | null;
  onDismissError?: () => void;
  logoSrc?: string;
}

export function SignInView({
  onGuest,
  onGoogle,
  onDiscord,
  onBack,
  loading,
  error,
  onDismissError,
  logoSrc = "/redline-logo.jpg",
}: SignInViewProps) {
  const busy = loading !== null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative" }}>
      <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src={logoSrc} alt="Redline" style={{ width: 220, height: "auto", marginBottom: 12 }} />

        <div style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 5, color: C.muted, marginBottom: 48 }}>
          NO BRAKES — NO MERCY
        </div>

        <h1 className="display" style={{ fontSize: 30, letterSpacing: 4, color: C.text, margin: "0 0 6px", textAlign: "center" }}>
          GET ON THE GRID
        </h1>
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, margin: "0 0 28px", textAlign: "center" }}>
          Sign in to save your runs and rank worldwide.
        </p>

        {error && (
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: `${C.accent}12`, border: `1px solid ${C.accent}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <span style={{ flex: 1, fontFamily: FONT.body, fontSize: 13, color: C.accent }}>{error}</span>
            {onDismissError && (
              <button onClick={onDismissError} aria-label="Dismiss" style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 16 }}>✕</button>
            )}
          </div>
        )}

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <ProviderButton label="Continue with Google" icon={<GoogleIcon />} loading={loading === "google"} disabled={busy} onClick={onGoogle} />
          <ProviderButton label="Continue with Discord" icon={<DiscordIcon />} loading={loading === "discord"} disabled={busy} onClick={onDiscord} />
        </div>

        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: FONT.body, fontSize: 11, letterSpacing: 3, color: C.dim }}>OR</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <button onClick={onGuest} disabled={busy} style={{ width: "100%", padding: 14, background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 12, color: busy ? C.dim : C.muted, fontFamily: FONT.body, fontWeight: 700, fontSize: 14, letterSpacing: 1, cursor: busy ? "not-allowed" : "pointer" }}>
          {loading === "guest" ? "Starting…" : "Continue as Guest"}
        </button>
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, textAlign: "center", lineHeight: 1.6, margin: "10px 0 0" }}>
          Guest runs are temporary and won’t be saved.
        </p>

        <p style={{ fontFamily: FONT.body, fontSize: 11, color: C.dim, textAlign: "center", lineHeight: 1.6, margin: "36px 0 12px" }}>
          By continuing you agree to race responsibly.<br />All runs are subject to anti-cheat review.
        </p>

        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontFamily: FONT.body, fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>
          ← BACK TO HOME
        </button>
      </div>
    </div>
  );
}

function ProviderButton({ label, icon, loading, disabled, onClick }: { label: string; icon: React.ReactNode; loading: boolean; disabled: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const active = hover && !disabled;

  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "15px 20px", background: active ? C.card : C.surface, border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 12, color: disabled && !loading ? C.dim : C.text, fontFamily: FONT.body, fontWeight: 700, fontSize: 14, letterSpacing: 0.5, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
      {loading ? <Spinner /> : icon}
      {loading ? "Redirecting…" : label}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin-slow 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}
