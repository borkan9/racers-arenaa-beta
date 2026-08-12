// lib/db/races.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { RaceRow, RaceInsert, RaceUpdate } from "@/types/database.types";

export interface DbResult<T> {
  data:  T | null;
  error: string | null;
}

export interface PaginatedResult<T> {
  data:   T[] | null;
  count:  number | null;
  error:  string | null;
}

type RawClient = {
  from: (table: string) => any;
};

function getRawClient(): RawClient {
  return supabaseAdmin as unknown as RawClient;
}

export async function createRace(payload: RaceInsert): Promise<DbResult<RaceRow>> {
  const raw = getRawClient();
  const { data, error } = await raw.from("races").insert(payload).select().single();
  if (error) {
    console.error("[db/races] createRace error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as RaceRow, error: null };
}

export async function getLatestRaceCreatedAtByUser(userId: string): Promise<DbResult<string>> {
  const raw = getRawClient();
  const { data, error } = await raw
    .from("races")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[db/races] latest race lookup error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: (data as { created_at?: string } | null)?.created_at ?? null, error: null };
}

export async function getPublicRaceStats(): Promise<{
  totalRaces: number;
  topSpeed: number;
  error: string | null;
}> {
  const raw = getRawClient();
  const { data, count, error } = await raw
    .from("races")
    .select("max_speed", { count: "exact" })
    .eq("status", "FINISHED")
    .eq("flagged", false)
    .eq("is_private", false)
    .order("max_speed", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[db/races] public stats error:", error.message);
    return { totalRaces: 0, topSpeed: 0, error: error.message };
  }

  const topSpeed = Array.isArray(data) && data[0]
    ? Number((data[0] as { max_speed: number }).max_speed)
    : 0;
  return { totalRaces: count ?? 0, topSpeed, error: null };
}

export async function getRaceById(id: string): Promise<DbResult<RaceRow>> {
  const raw = getRawClient();
  const { data, error } = await raw.from("races").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[db/races] getRaceById error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as RaceRow | null, error: null };
}

export async function getRacesByUserId(
  userId: string,
  requesterId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<PaginatedResult<RaceRow>> {
  const raw = getRawClient();
  const isOwner = userId === requesterId;

  let query = raw
    .from("races")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .neq("status", "REMOVED")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!isOwner) {
    query = query.eq("is_private", false).eq("status", "FINISHED").eq("flagged", false);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[db/races] getRacesByUserId error:", error.message);
    return { data: null, count: null, error: error.message };
  }
  return { data: (data ?? []) as RaceRow[], count, error: null };
}

export async function getFlaggedRaces(
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedResult<RaceRow>> {
  const raw = getRawClient();
  const { data, count, error } = await raw
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
  return { data: (data ?? []) as RaceRow[], count, error: null };
}

export async function updateRace(id: string, payload: RaceUpdate): Promise<DbResult<RaceRow>> {
  const raw = getRawClient();
  const { data, error } = await raw.from("races").update(payload).eq("id", id).select().single();
  if (error) {
    console.error("[db/races] updateRace error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as RaceRow, error: null };
}

export async function approveRace(id: string, note: string = ""): Promise<DbResult<RaceRow>> {
  return updateRace(id, { flagged: false, reviewed: true, flag_reason: note || null, status: "FINISHED" });
}

export async function removeRace(id: string, note: string = ""): Promise<DbResult<RaceRow>> {
  return updateRace(id, { reviewed: true, flag_reason: note || null, status: "REMOVED" });
}

export async function getUserBestStats(userId: string): Promise<{
  topSpeed: number | null;
  bestTimeMs: number | null;
  totalRaces: number;
  error: string | null;
}> {
  const raw = getRawClient();
  const { data, error } = await raw
    .from("races")
    .select("max_speed, duration_ms")
    .eq("user_id", userId)
    .eq("status", "FINISHED")
    .eq("flagged", false);

  if (error) {
    console.error("[db/races] getUserBestStats error:", error.message);
    return { topSpeed: null, bestTimeMs: null, totalRaces: 0, error: error.message };
  }

  if (!data || data.length === 0) return { topSpeed: null, bestTimeMs: null, totalRaces: 0, error: null };

  const rows = data as { max_speed: number; duration_ms: number | null }[];
  const topSpeed = Math.max(...rows.map((r) => r.max_speed));
  const times = rows.map((r) => r.duration_ms).filter((t): t is number => t !== null);
  const bestTimeMs = times.length > 0 ? Math.min(...times) : null;
  return { topSpeed, bestTimeMs, totalRaces: rows.length, error: null };
}
