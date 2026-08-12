// screens/RaceScreen.tsx

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Speedometer }        from "@/components/Speedometer";
import { LiveMap }            from "@/components/LiveMap";
import { CountdownOverlay }   from "@/components/CountdownOverlay";
import { useTelemetry }       from "@/hooks/useTelemetry";
import { useRaceSubmit }      from "@/hooks/useRace";
import { useSession }         from "@/hooks/useSession";
import {
  C, FONT, RACE_MODES, COUNTDOWN_OPTIONS,
  SPEEDO_MAX_KMH, SPEEDO_MAX_MPH, TIMER_INTERVAL_MS, MAX_ROUTE_POINTS,
} from "@/lib/constants";
import { fmtTime, fmtDist, convertSpeed } from "@/lib/utils";
import type {
  RacePhase, RaceModeId, SpeedUnit,
  CountdownSeconds, TelemetrySnapshot, RoutePoint, ScreenId,
} from "@/types";

interface RaceScreenProps {
  onExit: (dest: ScreenId) => void;
}

export function RaceScreen({ onExit }: RaceScreenProps) {
  const { isAuthenticated } = useSession();
  const { submitRace, submitStatus } = useRaceSubmit();

  // Config
  const [raceMode,  setRaceMode]  = useState<RaceModeId>("free");
  const [unit,      setUnit]      = useState<SpeedUnit>("kmh");
  const [countdown, setCountdown] = useState<CountdownSeconds>(3);
  const [isPrivate, setIsPrivate] = useState(false);

  // Race lifecycle
  const [phase,     setPhase]     = useState<RacePhase>("setup");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed,   setElapsed]   = useState(0);

  // Telemetry
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    speed: 0, topSpeed: 0, distance: 0, elapsed: 0,
    accel: 0, gForce: 0, lat: null, lng: null,
  });
  const [route, setRoute] = useState<RoutePoint[]>([]);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startLatRef = useRef<number | null>(null);
  const startLngRef = useRef<number | null>(null);

  const handleUpdate = useCallback((snapshot: TelemetrySnapshot) => {
    setTelemetry(snapshot);
    // Save start position
    if (snapshot.lat !== null && snapshot.lng !== null && startLatRef.current === null) {
      startLatRef.current = snapshot.lat;
      startLngRef.current = snapshot.lng;
    }
  }, []);

  const handleRoutePoint = useCallback((point: RoutePoint) => {
    setRoute((prev) => {
      const next = [...prev, point];
      if (next.length <= MAX_ROUTE_POINTS) return next;

      return next.filter((_, index) => (
        index === 0 || index === next.length - 1 || index % 2 === 0
      ));
    });
  }, []);

  const { gpsReady, gpsError } = useTelemetry({
    enabled:   phase !== "finished",
    startTime,
    simulate:  false,
    callbacks: { onUpdate: handleUpdate, onRoutePoint: handleRoutePoint },
  });

  // Timer
  useEffect(() => {
    if (phase === "racing" && startTime !== null) {
      timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), TIMER_INTERVAL_MS);
    } else {
      if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
      if (phase !== "finished") setElapsed(0);
    }
    return () => { if (timerRef.current !== null) clearInterval(timerRef.current); };
  }, [phase, startTime]);

  const handleCountdownComplete = useCallback(() => {
    setStartTime(Date.now());
    setPhase("racing");
  }, []);

  const handleStopRace = useCallback(async () => {
    setPhase("finished");

    if (!isAuthenticated) return;

    // Map raceMode to API format
    const modeMap: Record<RaceModeId, string> = {
      "free":     "FREE_RUN",
      "0-100":    "ZERO_TO_100",
      "0-200":    "ZERO_TO_200",
      "qmile":    "QUARTER_MILE",
      "topspeed": "TOP_SPEED",
    };

    // Convert speed if MPH
    const maxSpeedKmh = unit === "mph"
      ? telemetry.topSpeed / 0.621371
      : telemetry.topSpeed;

    const avgSpeedKmh = elapsed > 0
      ? telemetry.distance / (elapsed / 3_600_000)
      : 0;

    // Build GPS route points
    const gpsRoute = route
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      .map((p) => ({
        lat:   p.lat!,
        lng:   p.lng!,
        speed: p.speed ?? 0,
        ts:    p.ts ?? 0,
      }));

    const lastPoint = gpsRoute[gpsRoute.length - 1];

    await submitRace({
      mode:        modeMap[raceMode] as any,
      unit:        "KMH",
      duration_ms: elapsed,
      max_speed:   Math.round(maxSpeedKmh * 10) / 10,
      avg_speed:   Math.round(avgSpeedKmh * 10) / 10,
      distance_km: telemetry.distance,
      peak_accel:  telemetry.accel,
      start_lat:   startLatRef.current,
      start_lng:   startLngRef.current,
      finish_lat:  lastPoint?.lat ?? null,
      finish_lng:  lastPoint?.lng ?? null,
      route_points: gpsRoute,
      is_private:  isPrivate,
    });
  }, [phase, isAuthenticated, raceMode, unit, telemetry, route, elapsed, isPrivate, submitRace]);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setStartTime(null);
    setElapsed(0);
    setRoute([]);
    startLatRef.current = null;
    startLngRef.current = null;
    setTelemetry({ speed: 0, topSpeed: 0, distance: 0, elapsed: 0, accel: 0, gForce: 0, lat: null, lng: null });
  }, []);

  const displaySpeed    = convertSpeed(telemetry.speed,    unit);
  const displayTopSpeed = convertSpeed(telemetry.topSpeed, unit);
  const maxSpeedo       = unit === "mph" ? SPEEDO_MAX_MPH : SPEEDO_MAX_KMH;

  // ── SETUP ──
  if (phase === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <button onClick={() => onExit("home")} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.muted, cursor: "pointer", fontFamily: FONT.body, fontWeight: 600, fontSize: 13 }}>← BACK</button>
          <h1 className="display" style={{ fontSize: 28, letterSpacing: 4, color: C.text }}>NEW RUN</h1>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>

          {/* Race Mode */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 12, fontFamily: FONT.body }}>RACE MODE</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {RACE_MODES.map((m) => (
              <button key={m.id} onClick={() => setRaceMode(m.id as RaceModeId)}
                style={{ padding: "14px 16px", background: raceMode === m.id ? `${C.accent}15` : C.card, border: `1px solid ${raceMode === m.id ? C.accent : C.border}`, borderRadius: 10, color: raceMode === m.id ? C.text : C.muted, fontFamily: FONT.body, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Unit */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 12, fontFamily: FONT.body }}>UNIT</label>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {(["kmh", "mph"] as SpeedUnit[]).map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                style={{ flex: 1, padding: "12px", background: unit === u ? `${C.accent}15` : C.card, border: `1px solid ${unit === u ? C.accent : C.border}`, borderRadius: 10, color: unit === u ? C.accent : C.muted, fontFamily: FONT.display, fontSize: 20, letterSpacing: 3, cursor: "pointer", transition: "all 0.2s" }}>
                {u === "kmh" ? "KM/H" : "MPH"}
              </button>
            ))}
          </div>

          {/* Countdown */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 12, fontFamily: FONT.body }}>COUNTDOWN</label>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {COUNTDOWN_OPTIONS.map((c) => (
              <button key={c} onClick={() => setCountdown(c as CountdownSeconds)}
                style={{ flex: 1, padding: "14px", background: countdown === c ? `${C.accent}15` : C.card, border: `1px solid ${countdown === c ? C.accent : C.border}`, borderRadius: 10, color: countdown === c ? C.accent : C.muted, fontFamily: FONT.display, fontSize: 28, letterSpacing: 2, cursor: "pointer", transition: "all 0.2s" }}>
                {c}
              </button>
            ))}
          </div>

          {/* Private toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 14, color: C.text }}>Private Run</div>
              <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 2 }}>Won't appear on leaderboard</div>
            </div>
            <button role="switch" aria-checked={isPrivate} onClick={() => setIsPrivate(!isPrivate)}
              style={{ width: 50, height: 28, borderRadius: 14, border: "none", cursor: "pointer", background: isPrivate ? C.accent : C.dim, transition: "background 0.25s", position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: isPrivate ? 24 : 3, width: 22, height: 22, borderRadius: "50%", background: C.white, transition: "left 0.25s" }} />
            </button>
          </div>

          {!isAuthenticated && (
            <div style={{ background: `${C.yellow}10`, border: `1px solid ${C.yellow}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontFamily: FONT.body, fontSize: 13, color: C.yellow }}>
              ⚠ Sign in to save your runs and appear on the leaderboard.
            </div>
          )}

          <button disabled={!gpsReady} onClick={() => { if (gpsReady) setPhase("countdown"); }}
            style={{ width: "100%", padding: "20px", background: gpsReady ? C.accent : C.dim, border: "none", borderRadius: 14, color: C.white, fontFamily: FONT.display, fontSize: 24, letterSpacing: 6, cursor: gpsReady ? "pointer" : "wait", animation: gpsReady ? "glow-pulse 2s ease-in-out infinite" : "none", marginBottom: 12 }}>
            {gpsReady ? "▶ START RUN" : "⌖ ACQUIRING GPS"}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: gpsError ? C.yellow : C.muted, fontFamily: FONT.body, letterSpacing: 2 }}>
            {gpsError ?? (gpsReady ? "GPS LOCKED — READY TO RACE" : "WAITING FOR AN ACCURATE GPS FIX")}
          </div>
        </div>
      </div>
    );
  }

  // ── COUNTDOWN ──
  if (phase === "countdown") {
    return <CountdownOverlay from={countdown} onComplete={handleCountdownComplete} />;
  }

  // ── RACING / FINISHED ──
  const isRacing   = phase === "racing";
  const isFinished = phase === "finished";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRacing ? C.accent : C.muted, animation: isRacing ? "blink 1s step-end infinite" : "none" }} />
          <span className="display" style={{ fontSize: 16, letterSpacing: 4, color: isRacing ? C.accent : C.muted }}>
            {isRacing ? "LIVE RACE" : "RUN COMPLETE"}
          </span>
        </div>
        <div className="display" style={{ fontSize: 28, letterSpacing: 3, color: isRacing ? C.text : C.gold, fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(elapsed)}
        </div>
        {isFinished && (
          <button onClick={() => { handleReset(); onExit("history"); }}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.text, cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, fontSize: 12 }}>
            {submitStatus === "submitting" ? "SAVING…" : "VIEW HISTORY"}
          </button>
        )}
      </div>

      {/* Telemetry */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", gap: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Speedometer speed={displaySpeed} maxSpeed={maxSpeedo} unit={unit} style={{ maxWidth: 340 }} />
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
          {[
            { label: "TOP SPEED", val: `${Math.round(displayTopSpeed)}`, sub: unit === "mph" ? "mph" : "km/h", gold: true, hot: false },
            { label: "DISTANCE",  val: fmtDist(telemetry.distance, unit), sub: "", gold: false, hot: false },
            { label: "ACCEL",     val: telemetry.accel.toFixed(2), sub: "m/s²", gold: false, hot: false },
            { label: "G-FORCE",   val: telemetry.gForce.toFixed(2), sub: "G",   gold: false, hot: telemetry.gForce > 1 },
          ].map((s) => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 6, fontFamily: FONT.body }}>{s.label}</div>
              <div className="display" style={{ fontSize: 22, color: s.hot ? C.accent : s.gold ? C.gold : C.text, letterSpacing: 1 }}>{s.val}</div>
              {s.sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: FONT.body }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ height: 200, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, flexShrink: 0 }}>
          <LiveMap active={isRacing} routePoints={route} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: "16px 20px", paddingBottom: 32, flexShrink: 0 }}>
        {isRacing ? (
          <button onClick={handleStopRace}
            style={{ width: "100%", padding: "18px", background: "transparent", border: `2px solid ${C.accent}`, borderRadius: 14, color: C.accent, fontFamily: FONT.display, fontSize: 22, letterSpacing: 6, cursor: "pointer" }}>
            ⬛ STOP RUN
          </button>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={handleReset}
              style={{ padding: "16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontFamily: FONT.display, fontSize: 16, letterSpacing: 3, cursor: "pointer" }}>
              NEW RUN
            </button>
            <button onClick={() => { handleReset(); onExit("history"); }}
              style={{ padding: "16px", background: C.accent, border: "none", borderRadius: 12, color: C.white, fontFamily: FONT.display, fontSize: 16, letterSpacing: 3, cursor: "pointer" }}>
              {submitStatus === "submitting" ? "SAVING…" : submitStatus === "flagged" ? "⚠ FLAGGED" : "VIEW HISTORY"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
