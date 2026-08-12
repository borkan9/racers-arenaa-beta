// hooks/useProfile.ts

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/hooks/useSession";
import type { UserRow } from "@/types/database.types";

export type ProfileStatus = "idle" | "loading" | "success" | "error" | "not_found";

export interface UpdateProfilePayload {
  username?: string;
  bio?: string | null;
  avatar?: string | null;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export interface UseProfileReturn {
  profile: UserRow | null;
  status: ProfileStatus;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UpdateProfileResult>;
}

export function useProfile(): UseProfileReturn {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchingRef.current || !user?.id) return;
    fetchingRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      const body = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setStatus("not_found");
        setProfile(null);
        return;
      }
      if (!res.ok) {
        const message = body?.error ?? "Failed to fetch profile.";
        setError(message);
        setStatus("error");
        return;
      }

      setProfile(body.user as UserRow);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAuthenticated || !user?.id) {
      setProfile(null);
      setStatus("idle");
      return;
    }
    void fetchProfile();
  }, [isAuthenticated, sessionLoading, user?.id, fetchProfile]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload): Promise<UpdateProfileResult> => {
    if (!user?.id) return { success: false, error: "Not authenticated." };

    const body = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(body).length === 0) {
      return { success: false, error: "No fields provided." };
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data?.error ?? "Failed to update profile." };
      }

      setProfile(data.user as UserRow);
      setStatus("success");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    fetchingRef.current = false;
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
