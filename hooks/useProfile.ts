// hooks/useProfile.ts

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient }  from "@/lib/supabase/client";
import { useSession }    from "@/hooks/useSession";
import type { UserRow }  from "@/types/database.types";

export type ProfileStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "not_found";

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

export function useProfile(): UseProfileReturn {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [status,  setStatus]  = useState<ProfileStatus>("idle");
  const [error,   setError]   = useState<string | null>(null);

  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchingRef.current || !user?.id) return;
    fetchingRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (dbError) {
        console.error("[useProfile] error:", dbError.message);
        setError(dbError.message);
        setStatus("error");
        return;
      }

      if (!data) {
        // Profile doesn't exist — create it
        const { data: created, error: insertError } = await supabase
          .from("users")
          .insert({
            id:       user.id,
            username: user.email?.split("@")[0] ?? null,
            avatar:   user.user_metadata?.avatar_url ?? null,
            bio:      null,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[useProfile] insert error:", insertError.message);
          setStatus("not_found");
          return;
        }

        setProfile(created as UserRow);
        setStatus("success");
        return;
      }

      setProfile(data as UserRow);
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useProfile] unexpected error:", msg);
      setError(msg);
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
    fetchProfile();
  }, [isAuthenticated, sessionLoading, user?.id, fetchProfile]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<UpdateProfileResult> => {
      if (!user?.id) return { success: false, error: "Not authenticated." };

      const body = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined),
      );

      if (Object.keys(body).length === 0) {
        return { success: false, error: "No fields provided." };
      }

      try {
        const supabase = createClient();

        const { data, error: dbError } = await supabase
          .from("users")
          .update(body)
          .eq("id", user.id)
          .select()
          .single();

        if (dbError) {
          console.error("[useProfile] update error:", dbError.message);
          return { success: false, error: dbError.message };
        }

        setProfile(data as UserRow);
        setStatus("success");
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    },
    [user?.id],
  );

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