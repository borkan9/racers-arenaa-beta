import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPublicRaceStats } from "@/lib/db/races";

export async function GET(): Promise<NextResponse> {
  const raw = supabaseAdmin as unknown as { from: (table: string) => any };

  const [{ count: totalRacers, error: usersError }, raceStats] = await Promise.all([
    raw.from("users").select("id", { count: "exact", head: true }),
    getPublicRaceStats(),
  ]);

  if (usersError || raceStats.error) {
    console.error("[api/home] stats error:", usersError?.message ?? raceStats.error);
    return NextResponse.json({ error: "Failed to load home stats." }, { status: 500 });
  }

  return NextResponse.json(
    {
      total_racers: totalRacers ?? 0,
      total_races: raceStats.totalRaces,
      top_speed: raceStats.topSpeed,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
    },
  );
}
