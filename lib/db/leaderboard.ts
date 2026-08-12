// lib/db/leaderboard.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LeaderboardEntryRow,
  LeaderboardEntryInsert,
  BoardType,
  RaceMode,
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

type RawClient = {
  from: (table: string) => any;
};

async function getRawClient(): Promise<RawClient> {
  return createSupabaseServerClient() as unknown as RawClient;
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
  mode:       RaceMode,
  weekStart?: string,
  limit:      number = 50,
): Promise<DbResult<RankedEntry[]>> {
  const raw       = await getRawClient();
  const week      = weekStart ?? getWeekStart();
  const ascending = boardType === "BEST_TIME";

  const { data, error } = await raw
    .from("leaderboard_entries")
    .select(`*, users ( id, username, avatar )`)
    .eq("week_start", week)
    .eq("mode", mode)
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
  mode:       RaceMode,
  weekStart?: string,
): Promise<DbResult<LeaderboardEntryRow>> {
  const raw  = await getRawClient();
  const week = weekStart ?? getWeekStart();

  const { data, error } = await raw
    .from("leaderboard_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("mode", mode)
    .eq("board_type", boardType)
    .eq("week_start", week)
    .maybeSingle();

  if (error) {
    console.error("[db/leaderboard] getUserWeeklyEntry error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as LeaderboardEntryRow | null, error: null };
}

export async function upsertLeaderboardEntry(
  payload: LeaderboardEntryInsert,
): Promise<DbResult<LeaderboardEntryRow>> {
  const raw       = supabaseAdmin as unknown as RawClient;
  const ascending = payload.board_type === "BEST_TIME";

  const { data: existing, error: fetchError } = await raw
    .from("leaderboard_entries")
    .select("id, value")
    .eq("user_id",    payload.user_id)
    .eq("mode",       payload.mode)
    .eq("board_type", payload.board_type)
    .eq("week_start", payload.week_start)
    .maybeSingle();

  if (fetchError) {
    console.error("[db/leaderboard] fetch existing error:", fetchError.message);
    return { data: null, error: fetchError.message };
  }

  if (existing) {
    const row = existing as { id: string; value: number };

    const existingIsBetter = ascending
      ? row.value <= payload.value
      : row.value >= payload.value;

    if (existingIsBetter) {
      return { data: row as unknown as LeaderboardEntryRow, error: null };
    }

    const { data, error } = await raw
      .from("leaderboard_entries")
      .update({ value: payload.value, race_id: payload.race_id })
      .eq("id", row.id)
      .select()
      .single();

    if (error) {
      console.error("[db/leaderboard] update entry error:", error.message);
      return { data: null, error: error.message };
    }

    return { data: data as LeaderboardEntryRow, error: null };
  }

  const { data, error } = await raw
    .from("leaderboard_entries")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[db/leaderboard] insert entry error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as LeaderboardEntryRow, error: null };
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

  const raceMode = mode as RaceMode;
  const weekStart = getWeekStart();
  const entries: LeaderboardEntryInsert[] = [];

  if (raceMode === "FREE_RUN") {
    entries.push(
      { user_id: userId, race_id: raceId, week_start: weekStart, mode: raceMode, board_type: "TOP_SPEED", value: maxSpeed },
      { user_id: userId, race_id: raceId, week_start: weekStart, mode: raceMode, board_type: "DISTANCE", value: distanceKm },
    );
  } else if (raceMode === "TOP_SPEED") {
    entries.push(
      { user_id: userId, race_id: raceId, week_start: weekStart, mode: raceMode, board_type: "TOP_SPEED", value: maxSpeed },
    );
  } else if (
    raceMode === "ZERO_TO_100" ||
    raceMode === "ZERO_TO_200" ||
    raceMode === "QUARTER_MILE"
  ) {
    if (durationMs !== null && durationMs > 0) {
      entries.push({
        user_id: userId,
        race_id: raceId,
        week_start: weekStart,
        mode: raceMode,
        board_type: "BEST_TIME",
        value: durationMs,
      });
    }
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
