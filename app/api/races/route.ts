// app/api/races/route.ts
//
// POST /api/races        → save a completed race session
// GET  /api/races        → fetch authenticated user's race history
//
// Anti-cheat analysis runs on every POST before the row is inserted.
// Flagged races are saved but marked for admin review.

import { NextRequest, NextResponse }          from "next/server";
import { requireAuth }                         from "@/lib/auth/requireAuth";
import { createRace, getRacesByUserId }        from "@/lib/db/races";
import { submitRaceToLeaderboard }               from "@/lib/db/leaderboard";
import {
  validate,
  CreateRaceSchema,
  RaceListQuerySchema,
}                                              from "@/lib/validators/race.schema";
import {
  analyzeRace,
  deriveRouteMetrics,
}                                              from "@/lib/anticheat/analyze";
import type { RaceInsert, RoutePoint }         from "@/types/database.types";

// ─── POST /api/races ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // 3. Validate input
  const result = validate(CreateRaceSchema, body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 },
    );
  }

  const input = result.data;
  const routePoints = (input.route_points ?? []) as RoutePoint[];
  const derivedMetrics = deriveRouteMetrics(
    routePoints,
    input.duration_ms ?? null,
  );
  const distanceKm = derivedMetrics.distanceKm ?? input.distance_km;
  const avgSpeed   = derivedMetrics.avgSpeed   ?? input.avg_speed;

  // 4. Anti-cheat analysis
  const cheatResult = analyzeRace({
    maxSpeed:    input.max_speed,
    avgSpeed,
    peakAccel:   input.peak_accel ?? 0,
    distanceKm,
    durationMs:  input.duration_ms ?? null,
    routePoints,
  });

  // 5. Build race insert payload
  const payload: RaceInsert = {
    user_id:      guard.userId,
    mode:         input.mode,
    unit:         input.unit,
    duration_ms:  input.duration_ms   ?? null,
    max_speed:    input.max_speed,
    avg_speed:    avgSpeed,
    distance_km:  distanceKm,
    peak_accel:   input.peak_accel    ?? 0,
    start_lat:    input.start_lat     ?? null,
    start_lng:    input.start_lng     ?? null,
    finish_lat:   input.finish_lat    ?? null,
    finish_lng:   input.finish_lng    ?? null,
    route_points: input.route_points  ?? null,
    is_private:   input.is_private    ?? false,
    flagged:      cheatResult.flagged,
    flag_reason:  cheatResult.reason  ?? null,
    reviewed:     false,
    status:       cheatResult.flagged ? "FLAGGED" : "FINISHED",
  };

  // 6. Insert race
  const { data: race, error } = await createRace(payload);

  if (error || !race) {
    return NextResponse.json(
      { error: "Failed to save race." },
      { status: 500 },
    );
  }

  // 7. Update leaderboard without failing the saved race
  try {
    await submitRaceToLeaderboard({
      userId:     guard.userId,
      raceId:     race.id,
      mode:       race.mode,
      maxSpeed:   race.max_speed,
      durationMs: race.duration_ms,
      distanceKm: race.distance_km,
      isPrivate:  race.is_private,
      flagged:    race.flagged,
    });
  } catch (leaderboardError) {
    console.error(
      `[api/races] Failed to update leaderboard for race ${race.id}:`,
      leaderboardError,
    );
  }

  // 8. Log flagged races for visibility
  if (cheatResult.flagged) {
    console.warn(
      `[api/races] Race ${race.id} flagged for user ${guard.userId}. Reason: ${cheatResult.reason}. Confidence: ${cheatResult.confidence}`,
    );
  }

  return NextResponse.json(
    {
      race,
      flagged:    cheatResult.flagged,
      confidence: cheatResult.confidence,
      message:    cheatResult.flagged
        ? "Race saved but flagged for review."
        : "Race saved successfully.",
    },
    { status: 201 },
  );
}

// ─── GET /api/races ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  // 2. Parse and validate query params
  const { searchParams } = new URL(request.url);

  const queryResult = validate(RaceListQuerySchema, {
    limit:   searchParams.get("limit")   ?? 20,
    offset:  searchParams.get("offset")  ?? 0,
    user_id: searchParams.get("user_id") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: queryResult.error },
      { status: 400 },
    );
  }

  const { limit, offset, user_id } = queryResult.data;

  // 3. Determine whose history to fetch
  // If user_id is provided fetch that user's public races.
  // If not provided fetch the authenticated user's own races (incl. private).
  const targetUserId = user_id ?? guard.userId;

  const { data: races, count, error } = await getRacesByUserId(
    targetUserId,
    guard.userId,  // requesterId — used to decide private visibility
    limit,
    offset,
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch races." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      races:  races ?? [],
      count:  count ?? 0,
      limit,
      offset,
    },
    { status: 200 },
  );
}

// ─── METHOD GUARDS ────────────────────────────────────────────────────────────

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Contact an admin to remove a race." },
    { status: 405 },
  );
}
