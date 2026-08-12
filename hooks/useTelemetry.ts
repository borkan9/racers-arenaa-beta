// hooks/useTelemetry.ts

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { calcDistance, clamp } from "@/lib/utils";
import { ANTICHEAT, MAX_ROUTE_POINTS, TELEMETRY_INTERVAL_MS } from "@/lib/constants";
import type { TelemetrySnapshot, RoutePoint } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface TelemetryCallbacks {
  /**
   * Fired on every telemetry update (~every TELEMETRY_INTERVAL_MS ms).
   * Receives the latest snapshot — caller stores it in their own state.
   */
  onUpdate:     (snapshot: TelemetrySnapshot) => void;

  /**
   * Fired whenever a new GPS-derived route point is ready to be appended.
   * In simulation mode this fires on the same cadence as onUpdate.
   */
  onRoutePoint: (point: RoutePoint) => void;
}

export interface UseTelemetryOptions {
  /** Pass `true` while acquiring a GPS lock or recording a race. */
  enabled:    boolean;
  /** Unix-ms timestamp recorded when the race phase started. */
  startTime:  number | null;
  callbacks:  TelemetryCallbacks;
  /**
   * When `true` the hook generates synthetic telemetry instead of
   * reading real GPS / DeviceMotion.  Useful for dev and demo.
   */
  simulate?:  boolean;
}

export interface UseTelemetryResult {
  gpsReady: boolean;
  gpsError: string | null;
}

// ─── INTERNAL STATE SHAPE ────────────────────────────────────────────────────

interface InternalState {
  prevLat:       number | null;
  prevLng:       number | null;
  prevSpeed:     number;        // km/h
  prevTimestamp: number;        // ms
  totalDistance: number;        // km
  topSpeed:      number;        // km/h
  lockLat:       number | null;
  lockLng:       number | null;
  lockAccuracy:  number | null;
  lockTimestamp: number;
  stableFixes:   number;
  // Simulation only
  simSpeed:      number;
  simDir:        1 | -1;
  simRouteX:     number;
  simRouteY:     number;
}

// ─── SVG MAP BOUNDS (simulation) ─────────────────────────────────────────────

const SIM_START_X = 40;
const SIM_START_Y = 260;
const SIM_END_X   = 380;
const SIM_END_Y   =  60;
const GPS_MAX_ACCURACY_METERS = 25;
const GPS_REQUIRED_STABLE_FIXES = 2;
const GPS_MAX_SAMPLE_AGE_MS = 5_000;

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useTelemetry({
  enabled,
  startTime,
  callbacks,
  simulate = false,
}: UseTelemetryOptions): UseTelemetryResult {
  const [gpsReady, setGpsReady] = useState(simulate);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // All mutable internals live in a single ref — zero re-renders from the hook
  const state = useRef<InternalState>({
    prevLat:       null,
    prevLng:       null,
    prevSpeed:     0,
    prevTimestamp: Date.now(),
    totalDistance: 0,
    topSpeed:      0,
    lockLat:       null,
    lockLng:       null,
    lockAccuracy:  null,
    lockTimestamp: 0,
    stableFixes:   0,
    simSpeed:      0,
    simDir:        1,
    simRouteX:     SIM_START_X,
    simRouteY:     SIM_START_Y,
  });

  // Keep latest callbacks in a ref so interval closures never go stale
  const cbRef = useRef<TelemetryCallbacks>(callbacks);
  useEffect(() => { cbRef.current = callbacks; }, [callbacks]);

  // GPS watch handle
  const watchIdRef = useRef<number | null>(null);
  const initializedStartTimeRef = useRef<number | null>(null);

  // ── DeviceMotion data (kept in a ref, consumed on each tick) ──────────────
  const motionRef = useRef<{ accel: number; gForce: number }>({
    accel:  0,
    gForce: 0,
  });

  // ── DeviceMotion handler ──────────────────────────────────────────────────
  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const ag = e.accelerationIncludingGravity;
    if (!ag) return;

    const magnitude = Math.sqrt(
      (ag.x ?? 0) ** 2 +
      (ag.y ?? 0) ** 2 +
      (ag.z ?? 0) ** 2,
    );
    const gForce = magnitude / 9.81;

    const la     = e.acceleration;
    const linear = la
      ? Math.sqrt((la.x ?? 0) ** 2 + (la.y ?? 0) ** 2 + (la.z ?? 0) ** 2)
      : 0;

    motionRef.current = {
      accel:  parseFloat(clamp(linear, 0, ANTICHEAT.MAX_ACCELERATION_MS2).toFixed(2)),
      gForce: parseFloat(gForce.toFixed(2)),
    };
  }, []);

  // ── GPS position handler ───────────────────────────────────────────────────
  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const s          = state.current;
      const lat        = pos.coords.latitude;
      const lng        = pos.coords.longitude;
      const accuracy   = pos.coords.accuracy;
      const sampleTime = pos.timestamp;

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        !Number.isFinite(accuracy) ||
        accuracy > GPS_MAX_ACCURACY_METERS ||
        !Number.isFinite(sampleTime) ||
        Math.abs(Date.now() - sampleTime) > GPS_MAX_SAMPLE_AGE_MS
      ) {
        if (startTime === null) {
          s.stableFixes = 0;
          setGpsReady(false);
        }
        return;
      }

      if (startTime === null) {
        const stableDistanceMeters =
          s.lockLat !== null && s.lockLng !== null
            ? calcDistance(s.lockLat, s.lockLng, lat, lng) * 1_000
            : 0;

        s.stableFixes =
          s.lockLat === null || stableDistanceMeters <= GPS_MAX_ACCURACY_METERS
            ? s.stableFixes + 1
            : 1;
        s.lockLat       = lat;
        s.lockLng       = lng;
        s.lockAccuracy  = accuracy;
        s.lockTimestamp = sampleTime;

        if (s.stableFixes >= GPS_REQUIRED_STABLE_FIXES) {
          setGpsReady(true);
          setGpsError(null);
        }
        return;
      }

      if (!gpsReady || sampleTime <= s.prevTimestamp || sampleTime < startTime) {
        return;
      }

      const elapsed = sampleTime - startTime;
      const dtSec   = (sampleTime - s.prevTimestamp) / 1_000;
      if (dtSec <= 0) return;

      let distDelta = 0;
      if (s.prevLat !== null && s.prevLng !== null) {
        distDelta = calcDistance(s.prevLat, s.prevLng, lat, lng);
        const accuracyBufferKm = ((s.lockAccuracy ?? accuracy) + accuracy) / 1_000;
        const maxTravelKm = (ANTICHEAT.MAX_SPEED_KMH / 3_600) * dtSec;
        if (distDelta > maxTravelKm + accuracyBufferKm) return;
      }

      // Prefer browser-reported speed; fall back to position-delta derivation
      let speed = (pos.coords.speed ?? 0) * 3.6; // m/s → km/h

      if (speed === 0 && s.prevLat !== null && s.prevLng !== null) {
        speed = (distDelta / dtSec) * 3_600;
      }

      // Sanity-cap against anti-cheat threshold
      if (!Number.isFinite(speed) || speed < 0 || speed >= ANTICHEAT.MAX_SPEED_KMH) {
        return;
      }

      // Distance delta
      s.totalDistance += distDelta;

      // Acceleration from speed delta (used when DeviceMotion is unavailable)
      const accelFallback =
        dtSec > 0
          ? clamp(
              Math.abs((speed - s.prevSpeed) / 3.6 / dtSec),
              0,
              ANTICHEAT.MAX_ACCELERATION_MS2,
            )
          : 0;

      s.topSpeed      = Math.max(s.topSpeed, speed);
      s.prevLat       = lat;
      s.prevLng       = lng;
      s.prevSpeed     = speed;
      s.prevTimestamp = sampleTime;
      s.lockAccuracy  = accuracy;

      const snapshot: TelemetrySnapshot = {
        speed,
        topSpeed: s.topSpeed,
        distance: s.totalDistance,
        elapsed,
        accel:    motionRef.current.accel || parseFloat(accelFallback.toFixed(2)),
        gForce:   motionRef.current.gForce,
        lat,
        lng,
      };

      cbRef.current.onUpdate(snapshot);

      // Route point — map GPS coords to SVG space (simple linear projection)
      const routePoint = gpsToSvgPoint(lat, lng, speed, elapsed);
      cbRef.current.onRoutePoint(routePoint);
    },
    [gpsReady, startTime],
  );

  const handleGpsError = useCallback((err: GeolocationPositionError) => {
    console.warn("[useTelemetry] GPS error:", err.message);
    if (startTime === null) {
      state.current.stableFixes = 0;
      setGpsReady(false);
    }
    setGpsError(err.message);
  }, [startTime]);

  // ── Simulation tick ────────────────────────────────────────────────────────
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSimulation = useCallback(() => {
    if (!startTime) return;

    simIntervalRef.current = setInterval(() => {
      const now     = Date.now();
      const elapsed = now - startTime;
      const s       = state.current;

      // Smooth acceleration curve with noise
      const targetSpeed = Math.min(
        280,
        120 * (1 - Math.exp(-elapsed / 1_000 / 8)) +
          Math.sin(elapsed / 1_000 * 0.3) * 15 +
          Math.random() * 8,
      );
      s.simSpeed = s.simSpeed + (targetSpeed - s.simSpeed) * 0.15;

      const prevSpeed    = s.prevSpeed;
      const dtSec        = TELEMETRY_INTERVAL_MS / 1_000;
      const accel        = clamp(
        Math.abs((s.simSpeed - prevSpeed) / 3.6 / dtSec),
        0,
        ANTICHEAT.MAX_ACCELERATION_MS2,
      );
      const gForce       = parseFloat((accel * 0.1).toFixed(2));

      s.totalDistance   += (s.simSpeed / 3_600) * dtSec;
      s.topSpeed         = Math.max(s.topSpeed, s.simSpeed);
      s.prevSpeed        = s.simSpeed;

      const snapshot: TelemetrySnapshot = {
        speed:    s.simSpeed,
        topSpeed: s.topSpeed,
        distance: s.totalDistance,
        elapsed,
        accel:    parseFloat(accel.toFixed(2)),
        gForce,
        lat:      null,
        lng:      null,
      };

      cbRef.current.onUpdate(snapshot);

      // Advance SVG route position along the road diagonal
      const progress   = clamp(elapsed / 1_000 / 20, 0, 1);
      s.simRouteX      = SIM_START_X + progress * (SIM_END_X - SIM_START_X);
      s.simRouteY      =
        SIM_START_Y +
        progress * (SIM_END_Y - SIM_START_Y) +
        Math.sin(progress * 8) * 15;

      const routePoint: RoutePoint = {
        x:     s.simRouteX,
        y:     s.simRouteY,
        speed: s.simSpeed,
        ts:    elapsed,
      };

      cbRef.current.onRoutePoint(routePoint);
    }, TELEMETRY_INTERVAL_MS);
  }, [startTime]);

  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  // ── Request DeviceMotion permission (iOS 13+) ─────────────────────────────
  const startDeviceMotion = useCallback(() => {
    const DM = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DM.requestPermission === "function") {
      DM.requestPermission()
        .then((result) => {
          if (result === "granted") {
            window.addEventListener("devicemotion", handleMotion);
          }
        })
        .catch(() => {
          // Permission denied or unsupported — silently continue without it
        });
    } else {
      // Non-iOS: add listener directly
      window.addEventListener("devicemotion", handleMotion);
    }
  }, [handleMotion]);

  // ── Wake Lock: keep screen on while racing ────────────────────────────────
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (
          navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }
        ).wakeLock.request("screen");
      }
    } catch {
      // Wake lock is a best-effort feature — ignore failures
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    if (!enabled || startTime === null) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, startTime, acquireWakeLock]);

  useEffect(() => {
    if (
      startTime === null ||
      !gpsReady ||
      initializedStartTimeRef.current === startTime
    ) {
      return;
    }

    const s = state.current;
    if (s.lockLat === null || s.lockLng === null) return;

    initializedStartTimeRef.current = startTime;
    s.prevLat        = s.lockLat;
    s.prevLng        = s.lockLng;
    s.prevSpeed      = 0;
    s.prevTimestamp  = startTime;
    s.totalDistance  = 0;
    s.topSpeed       = 0;

    cbRef.current.onUpdate({
      speed: 0,
      topSpeed: 0,
      distance: 0,
      elapsed: 0,
      accel: 0,
      gForce: motionRef.current.gForce,
      lat: s.lockLat,
      lng: s.lockLng,
    });
    cbRef.current.onRoutePoint(gpsToSvgPoint(s.lockLat, s.lockLng, 0, 0));
  }, [gpsReady, startTime]);

  // ── Main effect: start / stop everything ─────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      // Tear down
      stopSimulation();

      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      window.removeEventListener("devicemotion", handleMotion);
      releaseWakeLock();

      // Reset internal counters for the next race
      const s          = state.current;
      s.prevLat        = null;
      s.prevLng        = null;
      s.prevSpeed      = 0;
      s.prevTimestamp  = Date.now();
      s.totalDistance  = 0;
      s.topSpeed       = 0;
      s.simSpeed       = 0;
      s.simDir         = 1;
      s.simRouteX      = SIM_START_X;
      s.simRouteY      = SIM_START_Y;
      s.lockLat        = null;
      s.lockLng        = null;
      s.lockAccuracy   = null;
      s.lockTimestamp  = 0;
      s.stableFixes    = 0;
      initializedStartTimeRef.current = null;
      setGpsReady(simulate);
      setGpsError(null);

      return;
    }

    if (simulate) {
      setGpsReady(true);
      setGpsError(null);
      if (startTime !== null) {
        acquireWakeLock();
        startSimulation();
      }
    } else {
      // Real GPS
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePosition,
          handleGpsError,
          {
            enableHighAccuracy: true,
            timeout:            5_000,
            maximumAge:         0,
          },
        );
      } else {
        // Never fabricate race telemetry when the device cannot provide GPS.
        setGpsReady(false);
        setGpsError("GPS is not available on this device.");
      }

      if (startTime !== null) {
        acquireWakeLock();
        startDeviceMotion();
      }
    }

    return () => {
      stopSimulation();

      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      window.removeEventListener("devicemotion", handleMotion);
      releaseWakeLock();
    };
  }, [
    enabled,
    startTime,
    simulate,
    startSimulation,
    stopSimulation,
    handlePosition,
    handleGpsError,
    handleMotion,
    startDeviceMotion,
    acquireWakeLock,
    releaseWakeLock,
  ]);

  return { gpsReady, gpsError };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Very rough GPS → SVG coordinate mapping.
 * In a real app you would use a proper Mercator projection or Mapbox SDK.
 * Here we clamp the point into the 40-380 x / 60-260 y SVG viewport.
 */
function gpsToSvgPoint(
  lat:     number,
  lng:     number,
  speed:   number,
  ts:      number,
): RoutePoint {
  // Normalise against approximate bounding box for a typical race straight
  const latMin = lat - 0.01;
  const latMax = lat + 0.01;
  const lngMin = lng - 0.01;
  const lngMax = lng + 0.01;

  const nx = clamp((lng - lngMin) / (lngMax - lngMin), 0, 1);
  const ny = clamp((lat - latMin) / (latMax - latMin), 0, 1);

  return {
    x:     SIM_START_X + nx * (SIM_END_X - SIM_START_X),
    y:     SIM_START_Y - ny * (SIM_START_Y - SIM_END_Y),
    lat,
    lng,
    speed,
    ts,
  };
}
