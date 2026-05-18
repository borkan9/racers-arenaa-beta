// lib/anticheat/analyze.ts
//
// Physics-based anti-cheat engine.
// Runs on every race POST before the row is inserted.
// Never throws — always returns a result object.
// All thresholds are constants at the top for easy tuning.

import type { RoutePoint } from "@/types/database.types";

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  // Maximum physically possible speed (km/h) — ThrustSSC record ~1228 km/h
  // We cap at 500 for road/track vehicles
  MAX_SPEED_KMH:          500,

  // Maximum acceleration for any road vehicle (m/s²)
  // Formula 1 peaks at ~14 m/s², dragsters ~30 m/s²
  MAX_ACCEL_MS2:           35,

  // Maximum GPS position jump per 500ms interval (km)
  // At 500 km/h a car travels ~0.069 km per 500ms — 0.15 gives 2x tolerance
  MAX_POSITION_JUMP_KM:   0.15,

  // Minimum realistic race duration for any mode (ms)
  MIN_DURATION_MS:       1_000,

  // Maximum ratio between avg_speed and max_speed
  // avg cannot be more than 95% of max in a realistic race
  MAX_AVG_TO_MAX_RATIO:   0.95,

  // Minimum ratio — avg cannot be below 20% of max (would mean almost no movement)
  MIN_AVG_TO_MAX_RATIO:   0.20,

  // Speed jump between two consecutive route points (km/h per second)
  // A car cannot gain or lose more than 200 km/h per second realistically
  MAX_SPEED_DELTA_PER_S:  200,

  // Confidence threshold above which a race is flagged
  FLAG_CONFIDENCE:        0.55,
} as const;

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AnalyzeRaceInput {
  maxSpeed:    number;          // km/h
  avgSpeed:    number;          // km/h
  peakAccel:   number;          // m/s²
  distanceKm:  number;          // km
  durationMs:  number | null;   // ms
  routePoints: RoutePoint[];
}

export interface AnalyzeRaceResult {
  flagged:    boolean;
  confidence: number;           // 0–1
  reason:     string | null;    // primary flag reason
  violations: Violation[];      // all detected violations
}

interface Violation {
  rule:       string;
  confidence: number;
  detail:     string;
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

/**
 * Analyses a race submission for physically impossible values.
 * Returns a result object — never throws.
 *
 * @example
 * const result = analyzeRace({ maxSpeed, avgSpeed, peakAccel, ... });
 * if (result.flagged) { // save with flagged = true }
 */
export function analyzeRace(input: AnalyzeRaceInput): AnalyzeRaceResult {
  const violations: Violation[] = [];

  // ── Rule 1: Impossible top speed ─────────────────────────────────────────
  if (input.maxSpeed > THRESHOLDS.MAX_SPEED_KMH) {
    violations.push({
      rule:       "MAX_SPEED_EXCEEDED",
      confidence: Math.min((input.maxSpeed / THRESHOLDS.MAX_SPEED_KMH) - 1 + 0.9, 1),
      detail:     `max_speed ${input.maxSpeed} km/h exceeds limit of ${THRESHOLDS.MAX_SPEED_KMH} km/h.`,
    });
  }

  // ── Rule 2: Impossible peak acceleration ─────────────────────────────────
  if (input.peakAccel > THRESHOLDS.MAX_ACCEL_MS2) {
    violations.push({
      rule:       "IMPOSSIBLE_ACCELERATION",
      confidence: Math.min((input.peakAccel / THRESHOLDS.MAX_ACCEL_MS2) - 1 + 0.8, 1),
      detail:     `peak_accel ${input.peakAccel} m/s² exceeds limit of ${THRESHOLDS.MAX_ACCEL_MS2} m/s².`,
    });
  }

  // ── Rule 3: avg_speed / max_speed ratio out of bounds ────────────────────
  if (input.maxSpeed > 0) {
    const ratio = input.avgSpeed / input.maxSpeed;

    if (ratio > THRESHOLDS.MAX_AVG_TO_MAX_RATIO) {
      violations.push({
        rule:       "UNREALISTIC_AVG_SPEED_HIGH",
        confidence: 0.75,
        detail:     `avg/max ratio ${ratio.toFixed(2)} exceeds ${THRESHOLDS.MAX_AVG_TO_MAX_RATIO}. Avg cannot be this close to max.`,
      });
    }

    if (ratio < THRESHOLDS.MIN_AVG_TO_MAX_RATIO && input.distanceKm > 0.1) {
      violations.push({
        rule:       "UNREALISTIC_AVG_SPEED_LOW",
        confidence: 0.60,
        detail:     `avg/max ratio ${ratio.toFixed(2)} is below ${THRESHOLDS.MIN_AVG_TO_MAX_RATIO}. Unrealistic for a race run.`,
      });
    }
  }

  // ── Rule 4: Duration too short ────────────────────────────────────────────
  if (
    input.durationMs !== null &&
    input.durationMs < THRESHOLDS.MIN_DURATION_MS
  ) {
    violations.push({
      rule:       "DURATION_TOO_SHORT",
      confidence: 0.85,
      detail:     `duration_ms ${input.durationMs} is below minimum of ${THRESHOLDS.MIN_DURATION_MS} ms.`,
    });
  }

  // ── Rule 5: Speed vs distance vs time consistency ─────────────────────────
  if (input.durationMs && input.durationMs > 0 && input.distanceKm > 0) {
    const durationHours  = input.durationMs / 3_600_000;
    const impliedAvgKmh  = input.distanceKm / durationHours;
    const discrepancy    = Math.abs(impliedAvgKmh - input.avgSpeed);
    const tolerance      = input.avgSpeed * 0.25; // 25% tolerance

    if (discrepancy > tolerance && impliedAvgKmh > 10) {
      violations.push({
        rule:       "SPEED_DISTANCE_TIME_MISMATCH",
        confidence: Math.min(discrepancy / input.avgSpeed, 0.90),
        detail:     `Implied avg ${impliedAvgKmh.toFixed(1)} km/h vs reported avg ${input.avgSpeed.toFixed(1)} km/h. Discrepancy: ${discrepancy.toFixed(1)} km/h.`,
      });
    }
  }

  // ── Rule 6: Route point analysis (GPS-based checks) ──────────────────────
  if (input.routePoints.length >= 2) {
    const routeViolations = analyzeRoutePoints(input.routePoints);
    violations.push(...routeViolations);
  }

  // ── Determine overall result ──────────────────────────────────────────────
  const confidence = violations.length > 0
    ? Math.min(Math.max(...violations.map((v) => v.confidence)), 1)
    : 0;

  const flagged = confidence >= THRESHOLDS.FLAG_CONFIDENCE;

  // Primary reason = highest-confidence violation
  const primary = violations
    .slice()
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  if (violations.length > 0) {
    console.warn(
      `[anticheat] ${violations.length} violation(s) detected. Confidence: ${confidence.toFixed(2)}. Flagged: ${flagged}.`,
      violations.map((v) => v.rule),
    );
  }

  return {
    flagged,
    confidence,
    reason:     primary?.rule ?? null,
    violations,
  };
}

// ─── ROUTE POINT ANALYSIS ─────────────────────────────────────────────────────

function analyzeRoutePoints(points: RoutePoint[]): Violation[] {
  const violations: Violation[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const dtMs  = curr.ts - prev.ts;
    const dtSec = dtMs / 1_000;

    if (dtSec <= 0) continue;

    // ── Check 6a: Individual point speed exceeds max ──────────────────────
    if (curr.speed > THRESHOLDS.MAX_SPEED_KMH) {
      violations.push({
        rule:       "ROUTE_POINT_SPEED_EXCEEDED",
        confidence: 0.90,
        detail:     `Route point ${i} speed ${curr.speed} km/h exceeds max.`,
      });
      continue; // No further checks needed for this pair
    }

    // ── Check 6b: Speed delta between consecutive points ─────────────────
    const speedDelta    = Math.abs(curr.speed - prev.speed);
    const deltaPerSec   = speedDelta / dtSec;

    if (deltaPerSec > THRESHOLDS.MAX_SPEED_DELTA_PER_S) {
      violations.push({
        rule:       "IMPOSSIBLE_SPEED_JUMP",
        confidence: Math.min(deltaPerSec / THRESHOLDS.MAX_SPEED_DELTA_PER_S - 1 + 0.65, 0.95),
        detail:     `Speed jumped ${speedDelta.toFixed(1)} km/h in ${dtSec.toFixed(2)}s (${deltaPerSec.toFixed(0)} km/h/s). Max allowed: ${THRESHOLDS.MAX_SPEED_DELTA_PER_S}.`,
      });
    }

    // ── Check 6c: GPS position jump (teleportation) ───────────────────────
    const distKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);

    if (distKm > THRESHOLDS.MAX_POSITION_JUMP_KM) {
      // Calculate expected max distance at reported speed
      const expectedMaxKm = (curr.speed / 3_600) * dtSec * 2; // 2x buffer
      if (distKm > Math.max(expectedMaxKm, THRESHOLDS.MAX_POSITION_JUMP_KM)) {
        violations.push({
          rule:       "GPS_TELEPORTATION",
          confidence: Math.min(distKm / THRESHOLDS.MAX_POSITION_JUMP_KM - 1 + 0.75, 0.97),
          detail:     `GPS jumped ${(distKm * 1000).toFixed(0)}m in ${dtSec.toFixed(2)}s. Max expected: ${(expectedMaxKm * 1000).toFixed(0)}m.`,
        });
      }
    }

    // ── Check 6d: Static GPS with high reported speed (fake location) ─────
    if (distKm < 0.001 && curr.speed > 80) {
      violations.push({
        rule:       "STATIC_GPS_HIGH_SPEED",
        confidence: 0.88,
        detail:     `GPS position unchanged but speed reported as ${curr.speed.toFixed(1)} km/h.`,
      });
    }
  }

  return violations;
}

// ─── HAVERSINE DISTANCE ───────────────────────────────────────────────────────

/**
 * Great-circle distance between two GPS coordinates in km.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R    = 6_371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}