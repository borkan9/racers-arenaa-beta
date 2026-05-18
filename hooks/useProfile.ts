// hooks/useProfile.ts
//
// Client-side profile hook.
// Fetches and caches the authenticated user's profile from /api/profile.
// Exposes an update function that PATCHes the API and syncs local state.
// Use this in any "use client" component that needs profile data.

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession }  from "@/hooks/useSession";
import type { UserRow } from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ProfileStatus =
  | "idle"      // hook mounted, session not yet known
  | "loading"   // fetch in progress
  | "success"   // profile loaded
  | "error"     // fetch failed
  | "not_found"; // authenticated but no profile row yet

export interface UpdateProfilePayload {
  username?: string;
  bio?:      string | null;
  avatar?:   string | null;
}

export interface UpdateProfileResult {
  success: boolean;
  error?:  string;
}

export interface UseProfileReturn {
  profile:       UserRow | null;
  status:        ProfileStatus;
  isLoading:     boolean;
  error:         string | null;
  refresh:       () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UpdateProfileResult>;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useProfile(): UseProfileReturn {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [status,  setStatus]  = useState<ProfileStatus>("idle");
  const [error,   setError]   = useState<string | null>(null);

  // Prevent fetch being called multiple times on mount
  const fetchingRef = useRef(false);

  // ── Fetch profile from API ────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method:      "GET",
        credentials: "include",  // send session cookie
        headers:     { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        // Session expired between hook mount and fetch
        setProfile(null);
        setStatus("idle");
        return;
      }

      if (res.status === 404) {
        setProfile(null);
        setStatus("not_found");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg  = body?.error ?? `Request failed with status ${res.status}.`;
        setError(msg);
        setStatus("error");
        return;
      }

      const body = await res.json();
      setProfile(body.user as UserRow);
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useProfile] fetch error:", msg);
      setError(msg);
      setStatus("error");
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // ── Auto-fetch when session becomes known ─────────────────────────────────
  useEffect(() => {
    if (sessionLoading) return; // wait for session check to finish

    if (!isAuthenticated) {
      setProfile(null);
      setStatus("idle");
      return;
    }

    fetchProfile();
  }, [isAuthenticated, sessionLoading, fetchProfile]);

  // ── Update profile ────────────────────────────────────────────────────────
  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<UpdateProfileResult> => {
      if (!isAuthenticated) {
        return { success: false, error: "Not authenticated." };
      }

      // Filter out undefined keys so we only send changed fields
      const body = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      );

      if (Object.keys(body).length === 0) {
        return { success: false, error: "No fields provided to update." };
      }

      try {
        const res = await fetch("/api/profile", {
          method:      "PATCH",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.error ?? `Update failed with status ${res.status}.`;
          console.error("[useProfile] updateProfile error:", msg);
          return { success: false, error: msg };
        }

        // Optimistically update local state with returned user
        if (data?.user) {
          setProfile(data.user as UserRow);
          setStatus("success");
        }

        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useProfile] Unexpected update error:", msg);
        return { success: false, error: msg };
      }
    },
    [isAuthenticated],
  );

  // ── Public refresh ────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchProfile();
  }, [isAuthenticated, fetchProfile]);

  return {
    profile,
    status,
    isLoading: status === "loading" || sessionLoading,
    error,
    refresh,
    updateProfile,
  };
}