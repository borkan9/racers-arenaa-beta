// hooks/useRace.ts
//
// Client-side race hook.
// Handles submitting a completed race to /api/races (POST)
// and fetching the authenticated user's race history (GET).
// Designed to be used by RaceScreen after a run finishes,
// and by HistoryScreen to display past runs.

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession }    from "@/hooks/useSession";
import type { RaceRow }  from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type RaceHistoryStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type SubmitRaceStatus =
  | "idle"
  | "submitting"
  | "success"
  | "flagged"   // saved but flagged for review
  | "error";

// What the client sends after a race ends
export interface SubmitRacePayload {
  mode:         string;
  unit:         "KMH" | "MPH";
  duration_ms?: number | null;
  max_speed:    number;
  avg_speed:    number;
  distance_km:  number;
  peak_accel?:  number;
  start_lat?:   number | null;
  start_lng?:   number | null;
  finish_lat?:  number | null;
  finish_lng?:  number | null;
  route_points?: {
    lat:   number;
    lng:   number;
    speed: number;
    ts:    number;
  }[];
  is_private?:  boolean;
}

export interface SubmitRaceResult {
  success:    boolean;
  race?:      RaceRow;
  flagged?:   boolean;
  error?:     string;
}

export interface UseRaceHistoryReturn {
  races:      RaceRow[];
  count:      number;
  status:     RaceHistoryStatus;
  isLoading:  boolean;
  error:      string | null;
  hasMore:    boolean;
  loadMore:   () => Promise<void>;
  refresh:    () => Promise<void>;
}

export interface UseRaceSubmitReturn {
  submitRace:    (payload: SubmitRacePayload) => Promise<SubmitRaceResult>;
  submitStatus:  SubmitRaceStatus;
  lastRace:      RaceRow | null;
  resetSubmit:   () => void;
}

// ─── RACE HISTORY HOOK ────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function useRaceHistory(targetUserId?: string): UseRaceHistoryReturn {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();

  const [races,  setRaces]  = useState<RaceRow[]>([]);
  const [count,  setCount]  = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<RaceHistoryStatus>("idle");
  const [error,  setError]  = useState<string | null>(null);

  const fetchingRef = useRef(false);

  // ── Fetch one page of races ───────────────────────────────────────────────
  const fetchRaces = useCallback(
    async (pageOffset: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setStatus("loading");
      setError(null);

      try {
        const params = new URLSearchParams({
          limit:  String(PAGE_SIZE),
          offset: String(pageOffset),
        });

        if (targetUserId) {
          params.set("user_id", targetUserId);
        }

        const res = await fetch(`/api/races?${params.toString()}`, {
          method:      "GET",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
        });

        if (res.status === 401) {
          setStatus("idle");
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
        const incoming = (body.races ?? []) as RaceRow[];

        setRaces((prev) => replace ? incoming : [...prev, ...incoming]);
        setCount(body.count ?? 0);
        setOffset(pageOffset + incoming.length);
        setStatus("success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useRaceHistory] fetch error:", msg);
        setError(msg);
        setStatus("error");
      } finally {
        fetchingRef.current = false;
      }
    },
    [targetUserId],
  );

  // ── Auto-fetch on mount when session is ready ─────────────────────────────
  useEffect(() => {
    if (sessionLoading)    return;
    if (!isAuthenticated)  return;
    fetchRaces(0, true);
  }, [isAuthenticated, sessionLoading, fetchRaces]);

  // ── Load next page ────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (status === "loading") return;
    if (races.length >= count) return;
    await fetchRaces(offset, false);
  }, [status, races.length, count, offset, fetchRaces]);

  // ── Refresh from top ──────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchRaces(0, true);
  }, [fetchRaces]);

  return {
    races,
    count,
    status,
    isLoading: status === "loading" || sessionLoading,
    error,
    hasMore:   races.length < count,
    loadMore,
    refresh,
  };
}

// ─── RACE SUBMIT HOOK ─────────────────────────────────────────────────────────

export function useRaceSubmit(): UseRaceSubmitReturn {
  const { isAuthenticated } = useSession();

  const [submitStatus, setSubmitStatus] = useState<SubmitRaceStatus>("idle");
  const [lastRace,     setLastRace]     = useState<RaceRow | null>(null);

  // ── Submit a completed race ───────────────────────────────────────────────
  const submitRace = useCallback(
    async (payload: SubmitRacePayload): Promise<SubmitRaceResult> => {
      if (!isAuthenticated) {
        return { success: false, error: "Not authenticated." };
      }

      setSubmitStatus("submitting");

      try {
        const res = await fetch("/api/races", {
          method:      "POST",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.error ?? `Submit failed with status ${res.status}.`;
          console.error("[useRaceSubmit] error:", msg);
          setSubmitStatus("error");
          return { success: false, error: msg };
        }

        const race    = data.race    as RaceRow;
        const flagged = data.flagged as boolean;

        setLastRace(race);
        setSubmitStatus(flagged ? "flagged" : "success");

        if (flagged) {
          console.warn(
            `[useRaceSubmit] Race ${race.id} saved but flagged for review.`,
          );
        }

        return { success: true, race, flagged };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useRaceSubmit] Unexpected error:", msg);
        setSubmitStatus("error");
        return { success: false, error: msg };
      }
    },
    [isAuthenticated],
  );

  // ── Reset after handling the result ──────────────────────────────────────
  const resetSubmit = useCallback(() => {
    setSubmitStatus("idle");
    setLastRace(null);
  }, []);

  return {
    submitRace,
    submitStatus,
    lastRace,
    resetSubmit,
  };
}