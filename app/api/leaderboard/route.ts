// app/api/leaderboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  getWeeklyLeaderboard,
  getUserWeeklyEntry,
  getWeekStart,
} from "@/lib/db/leaderboard";
import { getSession } from "@/lib/auth/getSession";
import { isBoardTypeAllowed } from "@/lib/racing/leaderboardRules";
import { z } from "zod";
import type { BoardType, RaceMode } from "@/types/database.types";

const LeaderboardQuerySchema = z.object({
  type: z.enum(["TOP_SPEED", "BEST_TIME", "DISTANCE"]).default("TOP_SPEED"),
  mode: z.enum(["FREE_RUN", "ZERO_TO_100", "ZERO_TO_200", "QUARTER_MILE", "TOP_SPEED"]).default("TOP_SPEED"),
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "week must be in YYYY-MM-DD format.").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const parsed = LeaderboardQuerySchema.safeParse({
    type: searchParams.get("type") ?? "TOP_SPEED",
    mode: searchParams.get("mode") ?? "TOP_SPEED",
    week: searchParams.get("week") ?? undefined,
    limit: searchParams.get("limit") ?? 50,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError ? `${firstError.path.join(".")}: ${firstError.message}` : "Invalid query parameters." },
      { status: 400 },
    );
  }

  const { type, mode, week, limit } = parsed.data;
  const boardType = type as BoardType;
  const raceMode = mode as RaceMode;

  if (!isBoardTypeAllowed(raceMode, boardType)) {
    return NextResponse.json(
      { error: `Leaderboard type ${boardType} is not valid for mode ${raceMode}.` },
      { status: 400 },
    );
  }

  const weekStart = week ?? getWeekStart();
  const { data: entries, error } = await getWeeklyLeaderboard(boardType, raceMode, weekStart, limit);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 });
  }

  let myEntry: { rank: number; value: number } | null = null;
  const { user } = await getSession();

  if (user) {
    const myRanked = entries?.find((e) => e.user_id === user.id);
    if (myRanked) {
      myEntry = { rank: myRanked.rank, value: myRanked.value };
    } else {
      const { data: stored } = await getUserWeeklyEntry(user.id, boardType, raceMode, weekStart);
      if (stored) myEntry = { rank: -1, value: stored.value };
    }
  }

  const sanitised = (entries ?? []).map((entry) => ({
    rank: entry.rank,
    value: entry.value,
    board_type: entry.board_type,
    mode: entry.mode,
    race_id: entry.race_id,
    week_start: entry.week_start,
    user: {
      id: entry.users.id,
      username: entry.users.username ?? "Anonymous",
      avatar: entry.users.avatar ?? null,
    },
  }));

  return NextResponse.json(
    {
      entries: sanitised,
      board_type: boardType,
      mode: raceMode,
      week_start: weekStart,
      total: sanitised.length,
      my_entry: myEntry,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    },
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
