// lib/db/leaderboard.ts

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LeaderboardEntryRow,
  LeaderboardEntryInsert,
  BoardType,
} from "@/types/database.types";

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

export function getWeekStart(date: Date = new Date()): string {
  const d    = new Date(date);
  const day  = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export async function getWeeklyLeaderboard(
  boardType:  BoardType,
  weekStart?: string,
  limit:      number = 50,
): Promise<DbResult<RankedEntry[]>> {
  const supabase  = createSupabaseServerClient();
  const week      = weekStart ?? getWeekStart();
  const ascending = boardType === "BEST_TIME";

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select(`*, users ( id, username, avatar )`)
    .eq("week_start", week)
    .eq("board_type", boardType)
    .order("value", { ascending })
    .limit(limit);

  if (error) {
    console.error("[db/leaderboard] getWeeklyLeaderboard error:", error.message);
    return { data: null, error: error.message };
  }

  const ranked: RankedEntry[] = (data as LeaderboardEntryWithUser[]).map(
    (entry, index) => ({ ...entry, rank: index + 1 }),
  );

  return { data: ranked, error: null };
}

export async function getUserWeeklyEntry(
  userId:     string,
  boardType:  BoardType,
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

export async function upsertLeaderboardEntry(
  payload: LeaderboardEntryInsert,
): Promise<DbResult<LeaderboardEntryRow>> {
  const supabase  = createSupabaseServerClient();
  const ascending = payload.board_type === "BEST_TIME";

  const { data: existing, error: fetchError } = await supabase
    .from("leaderboard_entries")
    .select("id, value")
    .eq("user_id",    payload.user_id)
    .eq("board_type", payload.board_type)
    .eq("week_start", payload.week_start)
    .maybeSingle();

  if (fetchError) {
    console.error("[db/leaderboard] fetch existing error:", fetchError.message);
    return { data: null, error: fetchError.message };
  }

  if (existing) {
    // Cast to access value safely
    const existingRow = existing as { id: string; value: number };

    const existingIsBetter = ascending
      ? existingRow.value <= payload.value
      : existingRow.value >= payload.value;

    if (existingIsBetter) {
      return { data: existingRow as unknown as LeaderboardEntryRow, error: null };
    }

    const { data, error } = await supabase
      .from("leaderboard_entries")
      .update({ value: payload.value, race_id: payload.race_id })
      .eq("id", existingRow.id)
      .select()
      .single();

    if (error) {
      console.error("[db/leaderboard] update entry error:", error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

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
    userId, raceId, mode, maxSpeed,
    durationMs, distanceKm, isPrivate, flagged,
  } = params;

  if (isPrivate || flagged) return;

  const weekStart = getWeekStart();

  const entries: LeaderboardEntryInsert[] = [
    { user_id: userId, race_id: raceId, week_start: weekStart, mode, board_type: "TOP_SPEED", value: maxSpeed },
    { user_id: userId, race_id: raceId, week_start: weekStart, mode, board_type: "DISTANCE",  value: distanceKm },
  ];

  if (durationMs !== null && durationMs > 0) {
    entries.push({
      user_id: userId, race_id: raceId, week_start: weekStart,
      mode, board_type: "BEST_TIME", value: durationMs,
    });
  }

  await Promise.all(
    entries.map(async (entry) => {
      const { error } = await upsertLeaderboardEntry(entry);
      if (error) {
        console.error(`[db/leaderboard] Failed to upsert ${entry.board_type}:`, error);
      }
    }),
  );
}