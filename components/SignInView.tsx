"use client";

import React from "react";
import styles from "./SignInView.module.css";

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
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="signin-title">
        <div className={styles.gridTexture} aria-hidden="true" />
        <div className={styles.speedLine} aria-hidden="true" />

        <header className={styles.brand}>
          <img className={styles.logo} src={logoSrc} alt="Redline" />
          <p className={styles.tagline}>Telemetry, Lap Times &amp; Live Race Performance</p>
        </header>

        <div className={styles.intro}>
          <span className={styles.eyebrow}><span className={styles.liveDot} /> DRIVER ACCESS</span>
          <h1 id="signin-title">GET ON THE GRID</h1>
          <p>Sign in to save your runs and rank worldwide.</p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <WarningIcon />
            <div className={styles.errorCopy}>
              <strong>Authentication failed</strong>
              <span>{error}</span>
            </div>
            {onDismissError && (
              <button type="button" onClick={onDismissError} className={styles.dismiss} aria-label="Dismiss error">×</button>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" onClick={onGoogle} disabled={busy} className={`${styles.providerButton} ${styles.googleButton}`}>
            {loading === "google" ? <Spinner /> : <GoogleIcon />}
            <span>{loading === "google" ? "Redirecting…" : "Continue with Google"}</span>
            <ChevronIcon />
          </button>

          <button type="button" onClick={onDiscord} disabled={busy} className={`${styles.providerButton} ${styles.discordButton}`}>
            {loading === "discord" ? <Spinner /> : <DiscordIcon />}
            <span>{loading === "discord" ? "Redirecting…" : "Continue with Discord"}</span>
            <ChevronIcon />
          </button>

          <div className={styles.divider}><span>OR QUICK ACCESS</span></div>

          <button type="button" onClick={onGuest} disabled={busy} className={`${styles.providerButton} ${styles.guestButton}`}>
            {loading === "guest" ? <Spinner /> : <GuestIcon />}
            <span>{loading === "guest" ? "Starting…" : "Continue as Guest"}</span>
            {loading !== "guest" && <span className={styles.instant}>INSTANT</span>}
          </button>

          <div className={styles.guestNotice}>
            <InfoIcon />
            <p><strong>Guest notice:</strong> Guest runs are temporary. Your session and run data <span>won’t be saved</span>.</p>
          </div>
        </div>

        <footer className={styles.footer}>
          <span><LockIcon /> Secure connection</span>
          <i aria-hidden="true">•</i>
          <span><FlagIcon /> Redline</span>
        </footer>

        <button type="button" onClick={onBack} className={styles.backButton}>← Back to home</button>
      </section>
    </main>
  );
}

function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}

function ChevronIcon() {
  return <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
}

function WarningIcon() {
  return <svg className={styles.warningIcon} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L12 3Z" /><path d="M12 9v4m0 3h.01" /></svg>;
}

function InfoIcon() {
  return <svg className={styles.infoIcon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

function FlagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></svg>;
}

function GuestIcon() {
  return <svg className={styles.guestIcon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0m2-5 2 2 4-5" /></svg>;
}

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.9 11.9 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function DiscordIcon() {
  return <svg className={styles.discordIcon} viewBox="0 0 24 24" aria-hidden="true"><path d="M19.7 5.4a18 18 0 0 0-4.4-1.4l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.4C1.5 9.2.7 13 .9 16.8a18 18 0 0 0 5.5 2.8l1.2-2a12 12 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11.6 0l.5.4a12 12 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.5-2.8c.3-4.4-.7-8.2-3.4-11.4ZM8.8 14.6c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.4 0c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z" /></svg>;
}
