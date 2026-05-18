// lib/db/leaderboard.ts
//
// All database queries for the leaderboard_entries table.
// Leaderboard entries are upserted after every valid (non-flagged) race.
// Weekly reset is handled by a Supabase scheduled function or cron job.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LeaderboardEntryRow,
  LeaderboardEntryInsert,
  BoardType,
} from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DbResult<T> {
  data:  T | null;
  error: string | null;
}

export interface LeaderboardEntryWithUser extends LeaderboardEntryRow {
  users: {
    id:       string;
    username: string | null;
    avatar:   string | null;
  };
}

export interface RankedEntry extends LeaderboardEntryWithUser {
  rank: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Returns the ISO date string for the Monday of the current week.
 * All weekly leaderboard entries are keyed by this value.
 *
 * @example "2026-05-11"
 */
export function getWeekStart(date: Date = new Date()): string {
  const d    = new Date(date);
  const day  = d.getUTCDay();                     // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;          // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];            // "YYYY-MM-DD"
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the weekly leaderboard for a given board type.
 * Joins with users table to return username and avatar.
 * Results are sorted by value:
 *   TOP_SPEED  → descending (highest first)
 *   BEST_TIME  → ascending  (fastest first)
 *   DISTANCE   → descending (longest first)
 */
export async function getWeeklyLeaderboard(
  boardType:  BoardType,
  weekStart?: string,
  limit:      number = 50,
): Promise<DbResult<RankedEntry[]>> {
  const supabase = createSupabaseServerClient();
  const week     = weekStart ?? getWeekStart();

  const ascending = boardType === "BEST_TIME";

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select(`
      *,
      users (
        id,
        username,
        avatar
      )
    `)
    .eq("week_start", week)
    .eq("board_type", boardType)
    .order("value", { ascending })
    .limit(limit);

  if (error) {
    console.error("[db/leaderboard] getWeeklyLeaderboard error:", error.message);
    return { data: null, error: error.message };
  }

  // Attach rank after sort
  const ranked: RankedEntry[] = (data as LeaderboardEntryWithUser[]).map(
    (entry, index) => ({ ...entry, rank: index + 1 }),
  );

  return { data: ranked, error: null };
}

/**
 * Fetch a single user's leaderboard entry for the current week.
 * Used to show the user their own rank on the leaderboard screen.
 */
export async function getUserWeeklyEntry(
  userId:    string,
  boardType: BoardType,
  weekStart?: string,
): Promise<DbResult<LeaderboardEntryRow>> {
  const supabase = createSupabaseServerClient();
  const week     = weekStart ?? getWeekStart();

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("board_type", boardType)
    .eq("week_start", week)
    .maybeSingle();

  if (error) {
    console.error("[db/leaderboard] getUserWeeklyEntry error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

/**
 * Upsert a leaderboard entry for the current week.
 *
 * For TOP_SPEED and DISTANCE: only updates if the new value is HIGHER.
 * For BEST_TIME: only updates if the new value is LOWER.
 *
 * This prevents slower or worse runs from overwriting personal bests.
 */
export async function upsertLeaderboardEntry(
  payload: LeaderboardEntryInsert,
): Promise<DbResult<LeaderboardEntryRow>> {
  const supabase  = createSupabaseServerClient();
  const ascending = payload.board_type === "BEST_TIME";

  // Check if an existing entry is already better
  const { data: existing } = await supabase
    .from("leaderboard_entries")
    .select("id, value")
    .eq("user_id",    payload.user_id)
    .eq("board_type", payload.board_type)
    .eq("week_start", payload.week_start)
    .maybeSingle();

  if (existing) {
    const existingIsBetter = ascending
      ? existing.value <= payload.value   // lower time is better
      : existing.value >= payload.value;  // higher speed/distance is better

    if (existingIsBetter) {
      // Current entry is already better — no update needed
      return { data: existing as unknown as LeaderboardEntryRow, error: null };
    }

    // Update existing entry with better value
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .update({ value: payload.value, race_id: payload.race_id })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("[db/leaderboard] update entry error:", error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  // No existing entry — insert new
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[db/leaderboard] insert entry error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Submits all relevant leaderboard entries for a finished race.
 * Called automatically after a valid race is saved.
 * Skips private or flagged races entirely.
 */
export async function submitRaceToLeaderboard(params: {
  userId:     string;
  raceId:     string;
  mode:       string;
  maxSpeed:   number;
  durationMs: number | null;
  distanceKm: number;
  isPrivate:  boolean;
  flagged:    boolean;
}): Promise<void> {
  const {
    userId,
    raceId,
    mode,
    maxSpeed,
    durationMs,
    distanceKm,
    isPrivate,
    flagged,
  } = params;

  // Never put private or flagged races on the leaderboard
  if (isPrivate || flagged) return;

  const weekStart = getWeekStart();

  const entries: LeaderboardEntryInsert[] = [
    // Top speed entry — every race qualifies
    {
      user_id:    userId,
      race_id:    raceId,
      week_start: weekStart,
      mode,
      board_type: "TOP_SPEED",
      value:      maxSpeed,
    },
    // Distance entry — every race qualifies
    {
      user_id:    userId,
      race_id:    raceId,
      week_start: weekStart,
      mode,
      board_type: "DISTANCE",
      value:      distanceKm,
    },
  ];

  // Best time entry — only if race has a recorded duration
  if (durationMs !== null && durationMs > 0) {
    entries.push({
      user_id:    userId,
      race_id:    raceId,
      week_start: weekStart,
      mode,
      board_type: "BEST_TIME",
      value:      durationMs,
    });
  }

  // Upsert all entries — log errors but do not throw
  await Promise.all(
    entries.map(async (entry) => {
      const { error } = await upsertLeaderboardEntry(entry);
      if (error) {
        console.error(
          `[db/leaderboard] Failed to upsert ${entry.board_type} for race ${raceId}:`,
          error,
        );
      }
    }),
  );
}