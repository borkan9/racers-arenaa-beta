// lib/db/users.ts
//
// All database queries for the users table.
// Never write raw Supabase queries in API routes — always go through here.
// This is the single place to update if the schema changes.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRow, UserInsert, UserUpdate } from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DbResult<T> {
  data:  T | null;
  error: string | null;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a single user profile by id.
 * Returns null (not an error) when the user does not exist yet.
 */
export async function getUserById(
  id: string,
): Promise<DbResult<UserRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[db/users] getUserById error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch a single user profile by username.
 * Used for public profile pages and search.
 */
export async function getUserByUsername(
  username: string,
): Promise<DbResult<UserRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[db/users] getUserByUsername error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Search users by username prefix.
 * Used for the Explore screen search bar.
 */
export async function searchUsers(
  query:  string,
  limit:  number = 20,
  offset: number = 0,
): Promise<DbResult<UserRow[]>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", `%${query}%`)
    .order("username", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[db/users] searchUsers error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Insert a new user profile row.
 * Called once when a user signs up for the first time.
 * For OAuth sign-ins, the callback route uses upsertUser instead.
 */
export async function createUser(
  payload: UserInsert,
): Promise<DbResult<UserRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[db/users] createUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Upsert a user profile row.
 * Safe to call multiple times — only creates a row if one doesn't exist.
 * Used by the OAuth callback to guarantee a profile row always exists.
 */
export async function upsertUser(
  payload: UserInsert,
): Promise<DbResult<UserRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error("[db/users] upsertUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update a user profile by id.
 * Only updates the fields provided — all others remain unchanged.
 * The caller must ensure id matches the authenticated user (checked in API layer).
 */
export async function updateUser(
  id:      string,
  payload: UserUpdate,
): Promise<DbResult<UserRow>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[db/users] updateUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a user profile row.
 * The corresponding auth.users row must be deleted separately via
 * supabase.auth.admin.deleteUser() using the service role key.
 * Only call this from an admin-guarded route.
 */
export async function deleteUser(
  id: string,
): Promise<DbResult<null>> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[db/users] deleteUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

// ─── USERNAME AVAILABILITY ────────────────────────────────────────────────────

/**
 * Returns true if the username is not already taken.
 * Used during profile setup and username change flows.
 */
export async function isUsernameAvailable(
  username:       string,
  excludeUserId?: string,
): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("users")
    .select("id")
    .eq("username", username);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[db/users] isUsernameAvailable error:", error.message);
    return false; // Fail closed — treat as unavailable on error
  }

  return data === null; // null means no row found → username is free
}