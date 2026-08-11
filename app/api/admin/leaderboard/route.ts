// app/api/admin/leaderboard/route.ts

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RawClient = {
  from: (table: string) => any;
};

function getWeekStart(date: Date = new Date()): string {
  const d    = new Date(date);
  const day  = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export async function POST(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const weekStart = getWeekStart();
  const raw = supabaseAdmin as unknown as RawClient;

  const { error } = await raw
    .from("leaderboard_entries")
    .delete()
    .eq("week_start", weekStart);

  if (error) {
    console.error(
      `[admin/leaderboard] Failed to reset week ${weekStart}:`,
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to reset weekly leaderboard." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, week_start: weekStart },
    { status: 200 },
  );
}
