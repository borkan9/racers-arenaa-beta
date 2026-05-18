// hooks/useSession.ts
//
// Client-side session hook.
// Wraps Supabase Auth state in a clean React interface.
// Automatically reacts to sign-in, sign-out, and token refresh events.
// Use this in any "use client" component that needs to know who is logged in.

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient }                      from "@/lib/supabase/client";
import type { Session, User }                from "@supabase/supabase-js";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "loading"       // initial check in progress
  | "authenticated" // valid session exists
  | "unauthenticated"; // no session

export interface UseSessionReturn {
  session:        Session | null;
  user:           User    | null;
  userId:         string  | null;
  status:         SessionStatus;
  isLoading:      boolean;
  isAuthenticated:boolean;
  signOut:        () => Promise<void>;
  refresh:        () => Promise<void>;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [status,  setStatus]  = useState<SessionStatus>("loading");

  const supabase = createClient();

  // ── Initial session load ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session: initial },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("[useSession] getSession error:", error.message);
          setSession(null);
          setStatus("unauthenticated");
          return;
        }

        setSession(initial);
        setStatus(initial ? "authenticated" : "unauthenticated");
      } catch (err) {
        if (!mounted) return;
        console.error("[useSession] Unexpected error:", err);
        setSession(null);
        setStatus("unauthenticated");
      }
    };

    loadSession();
    return () => { mounted = false; };
  }, []);

  // ── Auth state change listener ────────────────────────────────────────────
  // Fires on: sign-in, sign-out, token refresh, user update
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setStatus(newSession ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[useSession] signOut error:", error.message);
      }
      // onAuthStateChange fires automatically — no manual state update needed
    } catch (err) {
      console.error("[useSession] Unexpected signOut error:", err);
    }
  }, []);

  // ── Manual refresh ────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const {
        data: { session: refreshed },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("[useSession] refresh error:", error.message);
        return;
      }

      setSession(refreshed);
      setStatus(refreshed ? "authenticated" : "unauthenticated");
    } catch (err) {
      console.error("[useSession] Unexpected refresh error:", err);
    }
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const user            = session?.user           ?? null;
  const userId          = session?.user?.id       ?? null;
  const isLoading       = status === "loading";
  const isAuthenticated = status === "authenticated";

  return {
    session,
    user,
    userId,
    status,
    isLoading,
    isAuthenticated,
    signOut,
    refresh,
  };
}