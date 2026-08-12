import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRace } from "../lib/anticheat/analyze.ts";
import {
  QUARTER_MILE_KM,
  deriveRaceMetricsFromRoute,
} from "../lib/racing/rules.ts";
import {
  getAllowedBoardTypes,
  isBoardTypeAllowed,
} from "../lib/racing/leaderboardRules.ts";

const point = (lat: number, ts: number, speed = 0) => ({
  lat,
  lng: 31,
  ts,
  speed,
});

test("0-100 derives completion time from route movement", () => {
  const result = deriveRaceMetricsFromRoute("ZERO_TO_100", [
    point(30, 0),
    point(30.000524, 2_000),
  ]);

  assert.equal(result.routeValid, true);
  assert.equal(result.completed, true);
  assert.ok(result.durationMs !== null && result.durationMs > 1_500 && result.durationMs < 2_100);
  assert.ok(result.maxSpeed !== null && result.maxSpeed >= 100);
});

test("0-200 does not complete below target", () => {
  const result = deriveRaceMetricsFromRoute("ZERO_TO_200", [
    point(30, 0),
    point(30.001, 4_000),
  ]);

  assert.equal(result.routeValid, true);
  assert.equal(result.completed, false);
  assert.equal(result.reason, "TARGET_SPEED_NOT_REACHED");
  assert.equal(result.durationMs, null);
});

test("quarter mile completes at interpolated 0.402336km mark", () => {
  const result = deriveRaceMetricsFromRoute("QUARTER_MILE", [
    point(30, 0),
    point(30.004, 12_000),
  ]);

  assert.equal(result.routeValid, true);
  assert.equal(result.completed, true);
  assert.ok(result.distanceKm !== null && Math.abs(result.distanceKm - QUARTER_MILE_KM) < 0.000001);
  assert.ok(result.durationMs !== null && result.durationMs > 0 && result.durationMs < 12_000);
});

test("competitive route rejects non-increasing timestamps", () => {
  const result = deriveRaceMetricsFromRoute("TOP_SPEED", [
    point(30, 1_000),
    point(30.001, 1_000),
  ]);

  assert.equal(result.routeValid, false);
  assert.equal(result.reason, "INVALID_ROUTE_SEQUENCE");
});

test("leaderboard rules keep race modes separated", () => {
  assert.deepEqual(getAllowedBoardTypes("ZERO_TO_100"), ["BEST_TIME"]);
  assert.deepEqual(getAllowedBoardTypes("TOP_SPEED"), ["TOP_SPEED"]);
  assert.deepEqual(getAllowedBoardTypes("FREE_RUN"), ["TOP_SPEED", "DISTANCE"]);
  assert.equal(isBoardTypeAllowed("QUARTER_MILE", "BEST_TIME"), true);
  assert.equal(isBoardTypeAllowed("QUARTER_MILE", "TOP_SPEED"), false);
  assert.equal(isBoardTypeAllowed("TOP_SPEED", "BEST_TIME"), false);
});

test("anti-cheat flags impossible route speed", () => {
  const result = analyzeRace({
    maxSpeed: 600,
    avgSpeed: 100,
    peakAccel: 5,
    distanceKm: 1,
    durationMs: 20_000,
    routePoints: [point(30, 0), point(30.001, 1_000, 600)],
  });

  assert.equal(result.flagged, true);
  assert.ok(result.violations.some((violation) => violation.rule === "MAX_SPEED_EXCEEDED"));
});
