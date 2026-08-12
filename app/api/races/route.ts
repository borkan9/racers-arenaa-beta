// app/api/races/route.ts
//
// POST /api/races → save a completed race session
// GET  /api/races → fetch authenticated user's race history

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createRace, getRacesByUserId } from "@/lib/db/races";
import { submitRaceToLeaderboard } from "@/lib/db/leaderboard";
import {
  validate,
  CreateRaceSchema,
  RaceListQuerySchema,
} from "@/lib/validators/race.schema";
import { analyzeRace } from "@/lib/anticheat/analyze";
import {
  deriveRaceMetricsFromRoute,
  isCompetitiveRaceMode,
  isTimedRaceMode,
} from "@/lib/racing/rules";
import type { RaceInsert, RaceMode, RoutePoint } from "@/types/database.types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validate(CreateRaceSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const input = result.data;
  const mode = input.mode as RaceMode;
  const routePoints = (input.route_points ?? []) as RoutePoint[];
  const routeMetrics = deriveRaceMetricsFromRoute(mode, routePoints);
  const competitive = isCompetitiveRaceMode(mode);
  const timed = isTimedRaceMode(mode);

  let forcedFlagReason: string | null = null;
  if (competitive && !routeMetrics.routeValid) {
    forcedFlagReason = routeMetrics.reason ?? "COMPETITIVE_ROUTE_INVALID";
  } else if (timed && !routeMetrics.completed) {
    forcedFlagReason = routeMetrics.reason ?? "COMPETITIVE_TARGET_NOT_COMPLETED";
  }

  // Competitive results must come from the recorded route. Free Run may retain
  // the client summary when route telemetry is unavailable.
  const durationMs = routeMetrics.routeValid && routeMetrics.durationMs !== null
    ? routeMetrics.durationMs
    : (competitive ? null : input.duration_ms ?? null);
  const distanceKm = routeMetrics.routeValid && routeMetrics.distanceKm !== null
    ? routeMetrics.distanceKm
    : (competitive ? 0 : input.distance_km);
  const avgSpeed = routeMetrics.routeValid && routeMetrics.avgSpeed !== null
    ? routeMetrics.avgSpeed
    : (competitive ? 0 : input.avg_speed);
  const maxSpeed = routeMetrics.routeValid && routeMetrics.maxSpeed !== null
    ? routeMetrics.maxSpeed
    : (competitive ? 0 : input.max_speed);

  const cheatResult = analyzeRace({
    maxSpeed,
    avgSpeed,
    peakAccel: input.peak_accel ?? 0,
    distanceKm,
    durationMs,
    routePoints,
  });

  const flagged = Boolean(forcedFlagReason) || cheatResult.flagged;
  const flagReason = forcedFlagReason ?? cheatResult.reason ?? null;
  const confidence = forcedFlagReason ? 1 : cheatResult.confidence;

  const payload: RaceInsert = {
    user_id: guard.userId,
    mode,
    unit: "KMH",
    duration_ms: durationMs,
    max_speed: maxSpeed,
    avg_speed: avgSpeed,
    distance_km: distanceKm,
    peak_accel: input.peak_accel ?? 0,
    start_lat: routePoints[0]?.lat ?? input.start_lat ?? null,
    start_lng: routePoints[0]?.lng ?? input.start_lng ?? null,
    finish_lat: routePoints[routePoints.length - 1]?.lat ?? input.finish_lat ?? null,
    finish_lng: routePoints[routePoints.length - 1]?.lng ?? input.finish_lng ?? null,
    route_points: input.route_points ?? null,
    is_private: input.is_private ?? false,
    flagged,
    flag_reason: flagReason,
    reviewed: false,
    status: flagged ? "FLAGGED" : "FINISHED",
  };

  const { data: race, error } = await createRace(payload);
  if (error || !race) {
    return NextResponse.json({ error: "Failed to save race." }, { status: 500 });
  }

  if (!flagged) {
    try {
      await submitRaceToLeaderboard({
        userId: guard.userId,
        raceId: race.id,
        mode: race.mode,
        maxSpeed: race.max_speed,
        durationMs: race.duration_ms,
        distanceKm: race.distance_km,
        isPrivate: race.is_private,
        flagged: race.flagged,
      });
    } catch (leaderboardError) {
      console.error(`[api/races] Failed to update leaderboard for race ${race.id}:`, leaderboardError);
    }
  }

  if (flagged) {
    console.warn(
      `[api/races] Race ${race.id} flagged for user ${guard.userId}. Reason: ${flagReason}. Confidence: ${confidence}`,
    );
  }

  return NextResponse.json(
    {
      race,
      flagged,
      confidence,
      validation_reason: forcedFlagReason,
      message: flagged
        ? "Race saved but excluded from competition pending review."
        : "Race saved successfully.",
    },
    { status: 201 },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const queryResult = validate(RaceListQuerySchema, {
    limit: searchParams.get("limit") ?? 20,
    offset: searchParams.get("offset") ?? 0,
    user_id: searchParams.get("user_id") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json({ error: queryResult.error }, { status: 400 });
  }

  const { limit, offset, user_id } = queryResult.data;
  const targetUserId = user_id ?? guard.userId;

  const { data: races, count, error } = await getRacesByUserId(
    targetUserId,
    guard.userId,
    limit,
    offset,
  );

  if (error) {
    return NextResponse.json({ error: "Failed to fetch races." }, { status: 500 });
  }

  return NextResponse.json(
    { races: races ?? [], count: count ?? 0, limit, offset },
    { status: 200 },
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Contact an admin to remove a race." },
    { status: 405 },
  );
}
