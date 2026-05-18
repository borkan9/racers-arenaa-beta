// lib/db/races.ts
//
// All database queries for the races table.
// Never write raw Supabase queries in API routes — always go through here.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  RaceRow,
  RaceInsert,
  RaceUpdate,
} from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DbResult<T> {
  data:  T | null;
  error: string | null;
}

export interface PaginatedResult<T> {
  data:   T[] | null;
  count:  number | null;
  error:  string | null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Insert a completed race record.
 * Anti-cheat analysis must be run before calling this.
 */
export async function createRace(
  payload: RaceInsert,
): Promise<DbResult<RaceRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("races")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[db/races] createRace error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a single race by id.
 * Returns null if the race does not exist.
 */
export async function getRaceById(
  id: string,
): Promise<DbResult<RaceRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("races")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[db/races] getRaceById error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch paginated race history for a specific user.
 * Excludes REMOVED races.
 * Respects is_private — only the owner sees their private runs.
 */
export async function getRacesByUserId(
  userId:        string,
  requesterId:   string,
  limit:         number = 20,
  offset:        number = 0,
): Promise<PaginatedResult<RaceRow>> {
  const supabase    = createSupabaseServerClient();
  const isOwner     = userId === requesterId;

  let query = supabase
    .from("races")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .neq("status", "REMOVED")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Non-owners cannot see private runs
  if (!isOwner) {
    query = query.eq("is_private", false);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[db/races] getRacesByUserId error:", error.message);
    return { data: null, count: null, error: error.message };
  }

  return { data: data ?? [], count, error: null };
}

/**
 * Fetch all flagged races pending admin review.
 * Admin-only — call only from admin-guarded routes.
 */
export async function getFlaggedRaces(
  limit:  number = 50,
  offset: number = 0,
): Promise<PaginatedResult<RaceRow>> {
  const supabase = createSupabaseServerClient();

  const { data, count, error } = await supabase
    .from("races")
    .select("*", { count: "exact" })
    .eq("flagged", true)
    .eq("reviewed", false)
    .neq("status", "REMOVED")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[db/races] getFlaggedRaces error:", error.message);
    return { data: null, count: null, error: error.message };
  }

  return { data: data ?? [], count, error: null };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Partially update a race record.
 * Used by the admin panel to approve or remove flagged races.
 */
export async function updateRace(
  id:      string,
  payload: RaceUpdate,
): Promise<DbResult<RaceRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("races")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[db/races] updateRace error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Mark a race as reviewed and approved.
 * Clears the flagged state and sets status to FINISHED.
 */
export async function approveRace(
  id:   string,
  note: string = "",
): Promise<DbResult<RaceRow>> {
  return updateRace(id, {
    flagged:     false,
    reviewed:    true,
    flag_reason: note || null,
    status:      "FINISHED",
  });
}

/**
 * Mark a race as reviewed and removed.
 * Keeps the row for audit purposes but excludes it from all queries.
 */
export async function removeRace(
  id:   string,
  note: string = "",
): Promise<DbResult<RaceRow>> {
  return updateRace(id, {
    reviewed:    true,
    flag_reason: note || null,
    status:      "REMOVED",
  });
}

// ─── USER BEST STATS ──────────────────────────────────────────────────────────

/**
 * Returns the user's personal best stats across all finished races.
 * Used to populate the profile screen leaderboard stats.
 */
export async function getUserBestStats(userId: string): Promise<{
  topSpeed:   number | null;
  bestTimeMs: number | null;
  totalRaces: number;
  error:      string | null;
}> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("races")
    .select("max_speed, duration_ms")
    .eq("user_id", userId)
    .eq("status", "FINISHED")
    .eq("flagged", false);

  if (error) {
    console.error("[db/races] getUserBestStats error:", error.message);
    return { topSpeed: null, bestTimeMs: null, totalRaces: 0, error: error.message };
  }

  if (!data || data.length === 0) {
    return { topSpeed: null, bestTimeMs: null, totalRaces: 0, error: null };
  }

  const topSpeed = Math.max(...data.map((r) => r.max_speed));

  const times    = data
    .map((r) => r.duration_ms)
    .filter((t): t is number => t !== null);

  const bestTimeMs = times.length > 0 ? Math.min(...times) : null;

  return {
    topSpeed,
    bestTimeMs,
    totalRaces: data.length,
    error:      null,
  };
}