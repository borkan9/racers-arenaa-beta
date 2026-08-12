import type { RaceMode, RoutePoint } from "@/types/database.types";

export const QUARTER_MILE_KM = 0.402336;

export const TIMED_RACE_MODES: readonly RaceMode[] = [
  "ZERO_TO_100",
  "ZERO_TO_200",
  "QUARTER_MILE",
] as const;

export const COMPETITIVE_RACE_MODES: readonly RaceMode[] = [
  "ZERO_TO_100",
  "ZERO_TO_200",
  "QUARTER_MILE",
  "TOP_SPEED",
] as const;

export interface DerivedRaceMetrics {
  routeValid: boolean;
  reason: string | null;
  completed: boolean;
  durationMs: number | null;
  distanceKm: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  peakAccel: number | null;
}

export function isTimedRaceMode(mode: string): mode is RaceMode {
  return TIMED_RACE_MODES.includes(mode as RaceMode);
}

export function isCompetitiveRaceMode(mode: string): mode is RaceMode {
  return COMPETITIVE_RACE_MODES.includes(mode as RaceMode);
}

export function deriveRaceMetricsFromRoute(
  mode: RaceMode,
  points: RoutePoint[],
): DerivedRaceMetrics {
  if (points.length < 2) {
    return invalid("ROUTE_POINTS_REQUIRED");
  }

  const firstTs = points[0].ts;
  if (!Number.isFinite(firstTs) || firstTs < 0) {
    return invalid("INVALID_ROUTE_TIMESTAMP");
  }

  let cumulativeKm = 0;
  let previousSegmentSpeed = 0;
  let maxSpeed = 0;
  let peakAccel = 0;
  let completionTs: number | null = null;
  let completionDistanceKm: number | null = null;

  const targetSpeed = mode === "ZERO_TO_100"
    ? 100
    : mode === "ZERO_TO_200"
      ? 200
      : null;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (
      !Number.isFinite(prev.lat) || !Number.isFinite(prev.lng) ||
      !Number.isFinite(curr.lat) || !Number.isFinite(curr.lng) ||
      !Number.isFinite(prev.ts) || !Number.isFinite(curr.ts) ||
      curr.ts <= prev.ts
    ) {
      return invalid("INVALID_ROUTE_SEQUENCE");
    }

    const dtMs = curr.ts - prev.ts;
    const dtSec = dtMs / 1_000;
    const segmentKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
    if (!Number.isFinite(segmentKm)) {
      return invalid("INVALID_ROUTE_DISTANCE");
    }

    const segmentSpeed = (segmentKm / dtSec) * 3_600;
    if (!Number.isFinite(segmentSpeed) || segmentSpeed < 0) {
      return invalid("INVALID_ROUTE_SPEED");
    }

    maxSpeed = Math.max(maxSpeed, segmentSpeed);

    const accelMs2 = Math.abs((segmentSpeed - previousSegmentSpeed) / 3.6) / dtSec;
    if (Number.isFinite(accelMs2)) peakAccel = Math.max(peakAccel, accelMs2);

    if (completionTs === null) {
      if (targetSpeed !== null && segmentSpeed >= targetSpeed) {
        const denominator = segmentSpeed - previousSegmentSpeed;
        const fraction = denominator > 0
          ? clamp((targetSpeed - previousSegmentSpeed) / denominator, 0, 1)
          : 1;
        completionTs = prev.ts + dtMs * fraction;
        completionDistanceKm = cumulativeKm + segmentKm * fraction;
      } else if (mode === "QUARTER_MILE" && cumulativeKm + segmentKm >= QUARTER_MILE_KM) {
        const remainingKm = QUARTER_MILE_KM - cumulativeKm;
        const fraction = segmentKm > 0 ? clamp(remainingKm / segmentKm, 0, 1) : 1;
        completionTs = prev.ts + dtMs * fraction;
        completionDistanceKm = QUARTER_MILE_KM;
      }
    }

    cumulativeKm += segmentKm;
    previousSegmentSpeed = segmentSpeed;
  }

  const timed = isTimedRaceMode(mode);
  const completed = timed ? completionTs !== null : true;

  if (timed && !completed) {
    return {
      routeValid: true,
      reason: mode === "QUARTER_MILE" ? "QUARTER_MILE_NOT_COMPLETED" : "TARGET_SPEED_NOT_REACHED",
      completed: false,
      durationMs: null,
      distanceKm: cumulativeKm,
      avgSpeed: null,
      maxSpeed,
      peakAccel,
    };
  }

  const endTs = timed ? completionTs! : points[points.length - 1].ts;
  const durationMs = endTs - firstTs;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return invalid("INVALID_ROUTE_DURATION");
  }

  const distanceKm = timed
    ? (completionDistanceKm ?? cumulativeKm)
    : cumulativeKm;
  const avgSpeed = distanceKm / (durationMs / 3_600_000);

  return {
    routeValid: true,
    reason: null,
    completed: true,
    durationMs,
    distanceKm,
    avgSpeed,
    maxSpeed,
    peakAccel,
  };
}

function invalid(reason: string): DerivedRaceMetrics {
  return {
    routeValid: false,
    reason,
    completed: false,
    durationMs: null,
    distanceKm: null,
    avgSpeed: null,
    maxSpeed: null,
    peakAccel: null,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
