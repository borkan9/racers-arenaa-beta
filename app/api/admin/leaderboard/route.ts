// app/api/admin/leaderboard/route.ts

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getWeekStart } from "@/lib/db/leaderboard";

type RawClient = {
  from: (table: string) => any;
};

export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const allowed = await consumeRateLimit(`admin-board-read:${guard.userId}`, 60, 120);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many admin requests. Please retry shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const weekStart = getWeekStart();
  const raw = supabaseAdmin as unknown as RawClient;
  const { count, error } = await raw
    .from("leaderboard_entries")
    .select("id", { count: "exact", head: true })
    .eq("week_start", weekStart);

  if (error) {
    console.error(`[admin/leaderboard] Failed to count week ${weekStart}:`, error.message);
    return NextResponse.json({ error: "Failed to load leaderboard stats." }, { status: 500 });
  }

  return NextResponse.json(
    { week_start: weekStart, total_entries: count ?? 0 },
    { status: 200 },
  );
}

export async function POST(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const allowed = await consumeRateLimit(`admin-board-write:${guard.userId}`, 300, 5);
  if (!allowed) {
    return NextResponse.json(
      { error: "Leaderboard reset is temporarily rate limited." },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }

  const weekStart = getWeekStart();
  const raw = supabaseAdmin as unknown as RawClient;

  const { error } = await raw
    .from("leaderboard_entries")
    .delete()
    .eq("week_start", weekStart);

  if (error) {
    console.error(`[admin/leaderboard] Failed to reset week ${weekStart}:`, error.message);
    return NextResponse.json({ error: "Failed to reset weekly leaderboard." }, { status: 500 });
  }

  return NextResponse.json(
    { success: true, week_start: weekStart },
    { status: 200 },
  );
}
