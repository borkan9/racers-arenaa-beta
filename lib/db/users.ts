// lib/db/users.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserRow, UserInsert, UserUpdate } from "@/types/database.types";

export interface DbResult<T> {
  data: T | null;
  error: string | null;
}

type RawClient = {
  from: (table: string) => any;
};

function getRawClient(): RawClient {
  return supabaseAdmin as unknown as RawClient;
}

export async function getUserById(id: string): Promise<DbResult<UserRow>> {
  const { data, error } = await getRawClient().from("users").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[db/users] getUserById error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as UserRow | null, error: null };
}

export async function getUserByUsername(username: string): Promise<DbResult<UserRow>> {
  const { data, error } = await getRawClient().from("users").select("*").ilike("username", username).maybeSingle();
  if (error) {
    console.error("[db/users] getUserByUsername error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as UserRow | null, error: null };
}

export async function searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<DbResult<UserRow[]>> {
  const { data, error } = await getRawClient()
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
  const { data, error } = await getRawClient().from("users").insert(payload).select().single();
  if (error) {
    console.error("[db/users] createUser error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as UserRow, error: null };
}

export async function upsertUser(payload: UserInsert): Promise<DbResult<UserRow>> {
  const { data, error } = await getRawClient()
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

export async function updateUser(id: string, payload: UserUpdate): Promise<DbResult<UserRow>> {
  const { data, error } = await getRawClient().from("users").update(payload).eq("id", id).select().single();
  if (error) {
    console.error("[db/users] updateUser error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: data as UserRow, error: null };
}

export async function deleteUser(id: string): Promise<DbResult<null>> {
  const { error } = await getRawClient().from("users").delete().eq("id", id);
  if (error) {
    console.error("[db/users] deleteUser error:", error.message);
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  let query = getRawClient().from("users").select("id").ilike("username", username);
  if (excludeUserId) query = query.neq("id", excludeUserId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[db/users] isUsernameAvailable error:", error.message);
    return false;
  }
  return data === null;
}
