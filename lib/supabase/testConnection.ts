// lib/supabase/testConnection.ts
//
// Pure utility — no framework dependencies, no side effects on import.
// Call runSupabaseConnectionTest() explicitly; it never auto-executes.

import { supabase } from "./client";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface TestResult {
  success:   boolean;
  stage:     "read" | "insert" | "duplicate-check" | "unknown";
  message:   string;
  data?:     unknown;
  error?:    unknown;
}

// ─── TEST USER ────────────────────────────────────────────────────────────────

// A fixed username used as a sentinel so we never insert twice.
// Change this value if you need to re-run a fresh insert.
const TEST_USERNAME = "__supabase_connection_test__";

// ─── MAIN TEST FUNCTION ───────────────────────────────────────────────────────

/**
 * Runs a safe, idempotent Supabase connection test.
 *
 * Steps:
 *  1. Checks whether the test row already exists  (duplicate guard)
 *  2. If not found  → inserts the test row
 *  3. If found      → skips insert, returns existing row
 *
 * Never inserts more than one test row regardless of how many
 * times it is called.
 */
export async function runSupabaseConnectionTest(): Promise<TestResult> {
  
  // ── STAGE 1: duplicate-check ─────────────────────────────────────────────
  console.log("[supabase-test] Checking for existing test row…");

  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("id, username, created_at")
    .eq("username", TEST_USERNAME)
    .maybeSingle();         // returns null (not an error) when no row found

  if (readError) {
    const result: TestResult = {
      success: false,
      stage:   "read",
      message: "Failed to query the users table. Check your table name, RLS policies, and anon key.",
      error:   readError,
    };
    console.error("[supabase-test] ✗ Read failed:", readError);
    return result;
  }

  // ── STAGE 2a: row already exists → skip insert ────────────────────────────
  if (existing) {
    const result: TestResult = {
      success: true,
      stage:   "duplicate-check",
      message: "Test row already exists — insert skipped. Connection is healthy.",
      data:    existing,
    };
    console.log("[supabase-test] ✓ Row found, skipping insert:", existing);
    return result;
  }

  // ── STAGE 2b: row does not exist → insert once ────────────────────────────
  console.log("[supabase-test] No existing row found. Inserting test row…");

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      username: TEST_USERNAME,
      avatar:   null,
      bio:      "Automated Supabase connection test. Safe to delete.",
    })
    .select("id, username, created_at")
    .single();

  if (insertError) {
    const result: TestResult = {
      success: false,
      stage:   "insert",
      message: "Read succeeded but insert failed. Check RLS insert policy and column constraints.",
      error:   insertError,
    };
    console.error("[supabase-test] ✗ Insert failed:", insertError);
    return result;
  }

  const result: TestResult = {
    success: true,
    stage:   "insert",
    message: "Test row inserted successfully. Supabase connection is fully operational.",
    data:    inserted,
  };
  console.log("[supabase-test] ✓ Insert succeeded:", inserted);
  return result;
}