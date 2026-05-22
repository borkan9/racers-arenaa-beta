// lib/db/users.ts

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRow, UserInsert, UserUpdate } from "@/types/database.types";

export interface DbResult<T> {
  data:  T | null;
  error: string | null;
}

type RawClient = {
  from: (table: string) => any;
};

async function getRawClient(): Promise<RawClient> {
  return createSupabaseServerClient() as unknown as RawClient;
}

export async function getUserById(id: string): Promise<DbResult<UserRow>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[db/users] getUserById error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as UserRow | null, error: null };
}

export async function getUserByUsername(username: string): Promise<DbResult<UserRow>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[db/users] getUserByUsername error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as UserRow | null, error: null };
}

export async function searchUsers(
  query:  string,
  limit:  number = 20,
  offset: number = 0,
): Promise<DbResult<UserRow[]>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .select("*")
    .ilike("username", `%${query}%`)
    .order("username", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[db/users] searchUsers error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: (data ?? []) as UserRow[], error: null };
}

export async function createUser(payload: UserInsert): Promise<DbResult<UserRow>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[db/users] createUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

export async function upsertUser(payload: UserInsert): Promise<DbResult<UserRow>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error("[db/users] upsertUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

export async function updateUser(
  id:      string,
  payload: UserUpdate,
): Promise<DbResult<UserRow>> {
  const raw = await getRawClient();

  const { data, error } = await raw
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[db/users] updateUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

export async function deleteUser(id: string): Promise<DbResult<null>> {
  const raw = await getRawClient();

  const { error } = await raw
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[db/users] deleteUser error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function isUsernameAvailable(
  username:       string,
  excludeUserId?: string,
): Promise<boolean> {
  const raw = await getRawClient();

  let query = raw
    .from("users")
    .select("id")
    .eq("username", username);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[db/users] isUsernameAvailable error:", error.message);
    return false;
  }

  return data === null;
}