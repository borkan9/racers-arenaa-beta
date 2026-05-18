// app/api/leaderboard/route.ts
//
// GET /api/leaderboard                    → fetch weekly leaderboard
// GET /api/leaderboard?type=TOP_SPEED     → filter by board type
// GET /api/leaderboard?type=BEST_TIME
// GET /api/leaderboard?type=DISTANCE
// GET /api/leaderboard?week=2026-05-11    → fetch a specific past week
//
// Public endpoint — no auth required to read.
// Auth is checked only to attach the caller's own rank to the response.

import { NextRequest, NextResponse }    from "next/server";
import {
  getWeeklyLeaderboard,
  getUserWeeklyEntry,
  getWeekStart,
}                                       from "@/lib/db/leaderboard";
import { getSession }                   from "@/lib/auth/getSession";
import { z }                            from "zod";
import type { BoardType }               from "@/types/database.types";

// ─── QUERY SCHEMA ─────────────────────────────────────────────────────────────

const LeaderboardQuerySchema = z.object({
  type:  z
    .enum(["TOP_SPEED", "BEST_TIME", "DISTANCE"])
    .default("TOP_SPEED"),

  week:  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "week must be in YYYY-MM-DD format.")
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),
});

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // 1. Validate query params
  const parsed = LeaderboardQuerySchema.safeParse({
    type:  searchParams.get("type")  ?? "TOP_SPEED",
    week:  searchParams.get("week")  ?? undefined,
    limit: searchParams.get("limit") ?? 50,
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      {
        error: firstError
          ? `${firstError.path.join(".")}: ${firstError.message}`
          : "Invalid query parameters.",
      },
      { status: 400 },
    );
  }

  const { type, week, limit } = parsed.data;
  const boardType = type as BoardType;
  const weekStart = week ?? getWeekStart();

  // 2. Fetch leaderboard entries
  const { data: entries, error } = await getWeeklyLeaderboard(
    boardType,
    weekStart,
    limit,
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard." },
      { status: 500 },
    );
  }

  // 3. Optionally attach the caller's own rank
  // Non-blocking — if session read fails, we still return the leaderboard.
  let myEntry: { rank: number; value: number } | null = null;

  const { user } = await getSession();

  if (user) {
    const myRanked = entries?.find((e) => e.user_id === user.id);
    if (myRanked) {
      myEntry = { rank: myRanked.rank, value: myRanked.value };
    } else {
      // User exists but has no entry this week — fetch their stored value
      const { data: stored } = await getUserWeeklyEntry(
        user.id,
        boardType,
        weekStart,
      );
      if (stored) {
        // They have an entry that didn't make the top N — still show it
        myEntry = { rank: -1, value: stored.value };
      }
    }
  }

  // 4. Mask private user data
  // Users whose profiles are locked still appear but with hidden username.
  const sanitised = (entries ?? []).map((entry) => ({
    rank:       entry.rank,
    value:      entry.value,
    board_type: entry.board_type,
    mode:       entry.mode,
    race_id:    entry.race_id,
    week_start: entry.week_start,
    user: {
      id:       entry.users.id,
      username: entry.users.username ?? "Anonymous",
      avatar:   entry.users.avatar   ?? null,
    },
  }));

  return NextResponse.json(
    {
      entries:    sanitised,
      board_type: boardType,
      week_start: weekStart,
      total:      sanitised.length,
      my_entry:   myEntry,
    },
    {
      status: 200,
      headers: {
        // Cache for 60 seconds on CDN — leaderboard is not real-time
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    },
  );
}

// ─── METHOD GUARDS ────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}