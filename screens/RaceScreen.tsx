// screens/RaceScreen.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Speedometer } from "@/components/Speedometer";
import { LiveMap } from "@/components/LiveMap";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useRaceSubmit } from "@/hooks/useRace";
import { useSession } from "@/hooks/useSession";
import {
  C, FONT, RACE_MODES, COUNTDOWN_OPTIONS,
  SPEEDO_MAX_KMH, SPEEDO_MAX_MPH, TIMER_INTERVAL_MS, MAX_ROUTE_POINTS,
} from "@/lib/constants";
import { fmtTime, fmtDist, convertSpeed } from "@/lib/utils";
import type {
  RacePhase, RaceModeId, SpeedUnit,
  CountdownSeconds, TelemetrySnapshot, RoutePoint, ScreenId,
} from "@/types";

const QUARTER_MILE_KM = 0.402336;
const MAX_LONG_DISTANCE_KM = 800;

const MODE_API_NAMES: Record<RaceModeId, string> = {
  free: "FREE_RUN",
  "0-100": "ZERO_TO_100",
  "0-200": "ZERO_TO_200",
  qmile: "QUARTER_MILE",
  topspeed: "TOP_SPEED",
};

function isTimedMode(mode: RaceModeId): boolean {
  return mode === "0-100" || mode === "0-200" || mode === "qmile";
}

interface RaceScreenProps {
  onExit: (dest: ScreenId) => void;
  isGuest: boolean;
}

export function RaceScreen({ onExit, isGuest }: RaceScreenProps) {
  const { isAuthenticated } = useSession();
  const { submitRace, submitStatus } = useRaceSubmit();

  const [raceMode, setRaceMode] = useState<RaceModeId>("free");
  const [longDistance, setLongDistance] = useState(false);
  const [unit, setUnit] = useState<SpeedUnit>("kmh");
  const [countdown, setCountdown] = useState<CountdownSeconds>(3);
  const [isPrivate, setIsPrivate] = useState(false);

  const [phase, setPhase] = useState<RacePhase>("setup");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    speed: 0, topSpeed: 0, distance: 0, elapsed: 0,
    accel: 0, gForce: 0, lat: null, lng: null,
  });
  const [route, setRoute] = useState<RoutePoint[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startLatRef = useRef<number | null>(null);
  const startLngRef = useRef<number | null>(null);
  const completionTriggeredRef = useRef(false);

  const handleUpdate = useCallback((snapshot: TelemetrySnapshot) => {
    setTelemetry(snapshot);
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
    enabled: phase !== "finished",
    startTime,
    simulate: false,
    callbacks: { onUpdate: handleUpdate, onRoutePoint: handleRoutePoint },
  });

  useEffect(() => {
    if (phase === "racing" && startTime !== null) {
      timerRef.current = setInterval(
        () => setElapsed(Date.now() - startTime),
        TIMER_INTERVAL_MS,
      );
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (phase !== "finished") setElapsed(0);
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [phase, startTime]);

  const handleCountdownComplete = useCallback(() => {
    completionTriggeredRef.current = false;
    setStartTime(Date.now());
    setPhase("racing");
  }, []);

  const handleStopRace = useCallback(async (officialElapsedMs?: number) => {
    const finalElapsed = typeof officialElapsedMs === "number"
      ? officialElapsedMs
      : elapsed;

    setElapsed(finalElapsed);
    setPhase("finished");

    if (!isAuthenticated) return;

    // Telemetry is always stored internally as KM/H regardless of display unit.
    const maxSpeedKmh = telemetry.topSpeed;
    const avgSpeedKmh = finalElapsed > 0
      ? telemetry.distance / (finalElapsed / 3_600_000)
      : 0;

    const gpsRoute = route
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      .map((p) => ({
        lat: p.lat!,
        lng: p.lng!,
        speed: p.speed ?? 0,
        ts: p.ts ?? 0,
      }));

    const lastPoint = gpsRoute[gpsRoute.length - 1];

    await submitRace({
      mode: (longDistance ? "CUSTOM" : MODE_API_NAMES[raceMode]) as any,
      unit: "KMH",
      duration_ms: finalElapsed,
      max_speed: Math.round(maxSpeedKmh * 10) / 10,
      avg_speed: Math.round(avgSpeedKmh * 10) / 10,
      distance_km: longDistance ? Math.min(MAX_LONG_DISTANCE_KM, telemetry.distance) : telemetry.distance,
      peak_accel: telemetry.accel,
      start_lat: startLatRef.current,
      start_lng: startLngRef.current,
      finish_lat: lastPoint?.lat ?? null,
      finish_lng: lastPoint?.lng ?? null,
      route_points: gpsRoute,
      is_private: isPrivate,
    });
  }, [isAuthenticated, raceMode, longDistance, telemetry, route, elapsed, isPrivate, submitRace]);

  useEffect(() => {
    if (phase !== "racing" || completionTriggeredRef.current) return;

    const completed =
      (raceMode === "0-100" && telemetry.speed >= 100) ||
      (raceMode === "0-200" && telemetry.speed >= 200) ||
      (raceMode === "qmile" && telemetry.distance >= QUARTER_MILE_KM) ||
      (longDistance && telemetry.distance >= MAX_LONG_DISTANCE_KM);

    if (!completed) return;

    completionTriggeredRef.current = true;
    void handleStopRace(telemetry.elapsed > 0 ? telemetry.elapsed : elapsed);
  }, [phase, raceMode, longDistance, telemetry.speed, telemetry.distance, telemetry.elapsed, elapsed, handleStopRace]);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setStartTime(null);
    setElapsed(0);
    setRoute([]);
    startLatRef.current = null;
    startLngRef.current = null;
    completionTriggeredRef.current = false;
    setTelemetry({
      speed: 0, topSpeed: 0, distance: 0, elapsed: 0,
      accel: 0, gForce: 0, lat: null, lng: null,
    });
  }, []);

  const displaySpeed = convertSpeed(telemetry.speed, unit);
  const displayTopSpeed = convertSpeed(telemetry.topSpeed, unit);
  const maxSpeedo = unit === "mph" ? SPEEDO_MAX_MPH : SPEEDO_MAX_KMH;
  const timedMode = isTimedMode(raceMode);
  const guestRun = isGuest || !isAuthenticated;

  if (phase === "setup") {
    return (
      <div className="race-setup">
        <section className="race-hero">
          <div className="race-hero-copy">
            <span className="ra-kicker">Real roads. Real numbers.</span>
            <h1 className="race-hero-title">Make every<br /><em>kilometre count.</em></h1>
            <p>Track a quick performance run or record the whole drive. Your speed, route and stats update live.</p>
            <div className="race-hero-meta"><span className="live-dot" /> GPS TELEMETRY <span className="race-hero-divider" /> BUILT FOR THE DRIVE</div>
          </div>
          <div className="race-hero-art" aria-hidden="true"><span className="hero-mark">RA</span><span className="hero-caption">01 / DRIVE</span></div>
        </section>

        <section className="race-workspace">
          <div className="race-config ra-card">
            <div className="race-config-heading"><div><span className="ra-kicker">Your next session</span><h2>Set up a run</h2></div><span className="gps-pill"><i className={gpsReady ? "gps-dot is-ready" : "gps-dot"} />{gpsReady ? "GPS READY" : "FINDING GPS"}</span></div>

            <div className="ra-label">CHOOSE YOUR DRIVE</div>
            <div className="race-type-switch">
              <button type="button" onClick={() => setLongDistance(false)} className={!longDistance ? "race-type-option is-selected" : "race-type-option"}>
                <span className="type-icon">↗</span><span><strong>Quick race</strong><small>0–100, quarter mile & more</small></span><span className="type-arrow">→</span>
              </button>
              <button type="button" onClick={() => { setLongDistance(true); setRaceMode("free"); }} className={longDistance ? "race-type-option is-selected" : "race-type-option"}>
                <span className="type-icon">⌁</span><span><strong>Long distance</strong><small>Start anytime · 1–800 km</small></span><span className="type-arrow">→</span>
              </button>
            </div>

            {longDistance ? (
              <div className="distance-config">
                <div className="ra-label">OPEN DISTANCE</div>
                <p className="config-hint">Start your trip whenever you’re ready. Minimum recorded distance: 1 km. Maximum: 800 km. You can stop manually anytime; tracking ends automatically at 800 km.</p>
              </div>
            ) : (
              <div className="sprint-config">
                <div className="ra-label">PICK A CHALLENGE</div>
                <div className="sprint-options">{RACE_MODES.map((mode) => <button type="button" key={mode.id} onClick={() => setRaceMode(mode.id as RaceModeId)} className={raceMode === mode.id ? "sprint-chip is-selected" : "sprint-chip"}>{mode.label}</button>)}</div>
                <p className="config-hint">{raceMode === "0-100" ? "Timer stops as soon as you hit 100 km/h." : raceMode === "0-200" ? "Timer stops as soon as you hit 200 km/h." : raceMode === "qmile" ? "Timer stops at the quarter-mile mark." : raceMode === "topspeed" ? "Track your top speed, then finish whenever you’re ready." : "A free run with live speed, distance and route."}</p>
              </div>
            )}

            <div className="config-bottom-row">
              <div className="unit-control"><span className="ra-label">SPEED UNIT</span><div>{(["kmh", "mph"] as SpeedUnit[]).map((value) => <button key={value} type="button" onClick={() => setUnit(value)} className={unit === value ? "unit-option is-selected" : "unit-option"}>{value === "kmh" ? "km/h" : "mph"}</button>)}</div></div>
              {!longDistance && <div className="unit-control"><span className="ra-label">START TIMER</span><div>{COUNTDOWN_OPTIONS.map((value) => <button key={value} type="button" onClick={() => setCountdown(value as CountdownSeconds)} className={countdown === value ? "unit-option is-selected" : "unit-option"}>{value}s</button>)}</div></div>}
            </div>

            {!guestRun && <div className="privacy-row"><span><strong>Private run</strong><small>Keep this session off the public ranks</small></span><button role="switch" aria-checked={isPrivate} onClick={() => setIsPrivate(!isPrivate)} className={isPrivate ? "privacy-switch is-on" : "privacy-switch"} aria-label="Make this a private run"><i /></button></div>}
            {guestRun && <p className="config-hint" role="status">Guest mode · your run is live, but it won’t be saved to your profile or ranks.</p>}

            <button disabled={!gpsReady} onClick={() => { if (gpsReady) setPhase("countdown"); }} className="start-run-button"><span>{gpsReady ? "START YOUR RUN" : "WAITING FOR GPS"}</span><b>↗</b></button>
            <div className={gpsError ? "gps-message has-error" : "gps-message"}>{gpsError ?? (gpsReady ? "GPS locked · Ready when you are" : "Allow location access to start tracking")}</div>
          </div>

          <aside className="race-side-panel">
            <div className="session-preview">
              <div className="preview-topline"><span>SESSION PREVIEW</span><span>RA / 01</span></div>
              <div className="preview-track"><div className="track-grid" /><svg viewBox="0 0 420 240" role="presentation"><path d="M25 206 C70 190 62 152 118 148 S151 170 190 145 S221 82 272 94 S321 125 347 91 S362 51 397 31" fill="none" stroke="rgba(242,239,233,.11)" strokeWidth="24" strokeLinecap="round"/><path d="M25 206 C70 190 62 152 118 148 S151 170 190 145 S221 82 272 94 S321 125 347 91 S362 51 397 31" fill="none" stroke="#e64c2e" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 8"/><circle cx="25" cy="206" r="7" fill="#f2efe9"/><circle cx="397" cy="31" r="7" fill="#e64c2e"/><circle cx="397" cy="31" r="15" fill="none" stroke="#e64c2e" opacity=".35"/></svg><span className="track-km track-km-start">START</span><span className="track-km track-km-end">FINISH</span></div>
              <div className="preview-footer"><div><small>ROUTE</small><strong>{longDistance ? "Open trip · up to 800 km" : raceMode === "free" ? "Free run" : RACE_MODES.find((mode) => mode.id === raceMode)?.label}</strong></div><span>GPS TRACKED</span></div>
            </div>
            <div className="stat-teaser"><span className="ra-kicker">Every run, measured</span><div className="teaser-grid"><div><strong>01</strong><span>Top speed</span></div><div><strong>02</strong><span>Average speed</span></div><div><strong>03</strong><span>Full route</span></div><div><strong>04</strong><span>Trip distance</span></div></div></div>
            <div className="safety-note"><span>i</span><p>Use GPS tracking only when it’s safe. Set your phone before driving and keep your focus on the road.</p></div>
          </aside>
        </section>
      </div>
    );
  }

  if (phase === "countdown") {
    return <CountdownOverlay from={countdown} onComplete={handleCountdownComplete} />;
  }

  const isRacing = phase === "racing";
  const isFinished = phase === "finished";

  return (
    <div className="race-active" style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRacing ? C.accent : C.muted, animation: isRacing ? "blink 1s step-end infinite" : "none" }} />
          <span className="display" style={{ fontSize: 16, letterSpacing: 4, color: isRacing ? C.accent : C.muted }}>
            {isRacing ? (longDistance ? "LONG DISTANCE · LIVE" : "LIVE RACE") : (longDistance ? "TRIP COMPLETE" : "RUN COMPLETE")}
          </span>
        </div>
        <div className="display" style={{ fontSize: 28, letterSpacing: 3, color: isRacing ? C.text : C.gold, fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(elapsed)}
        </div>
        {isFinished && isAuthenticated && (
          <button onClick={() => { handleReset(); onExit("history"); }}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.text, cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, fontSize: 12 }}>
            {submitStatus === "submitting" ? "SAVING…" : "VIEW HISTORY"}
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", gap: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Speedometer speed={displaySpeed} maxSpeed={maxSpeedo} unit={unit} style={{ maxWidth: 340 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, flexShrink: 0 }}>
          {(longDistance ? [
            { label: "TOP SPEED", val: `${Math.round(displayTopSpeed)}`, sub: unit === "mph" ? "mph" : "km/h", gold: true, hot: false },
            { label: "AVG SPEED", val: `${Math.round(convertSpeed(telemetry.elapsed > 0 ? telemetry.distance / (telemetry.elapsed / 3_600_000) : 0, unit))}`, sub: unit === "mph" ? "mph" : "km/h", gold: false, hot: false },
            { label: "DISTANCE", val: fmtDist(telemetry.distance, unit), sub: "", gold: false, hot: false },
            { label: "G-FORCE", val: telemetry.gForce.toFixed(2), sub: "G", gold: false, hot: telemetry.gForce > 1 },
          ] : [
            { label: "TOP SPEED", val: `${Math.round(displayTopSpeed)}`, sub: unit === "mph" ? "mph" : "km/h", gold: true, hot: false },
            { label: "DISTANCE", val: fmtDist(telemetry.distance, unit), sub: "", gold: false, hot: false },
            { label: "ACCEL", val: telemetry.accel.toFixed(2), sub: "m/s²", gold: false, hot: false },
            { label: "G-FORCE", val: telemetry.gForce.toFixed(2), sub: "G", gold: false, hot: telemetry.gForce > 1 },
          ]).map((s) => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 6, fontFamily: FONT.body }}>{s.label}</div>
              <div className="display" style={{ fontSize: 22, color: s.hot ? C.accent : s.gold ? C.gold : C.text, letterSpacing: 1 }}>{s.val}</div>
              {s.sub && <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: FONT.body }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {longDistance && <div style={{ marginTop: -5 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, color: C.muted, fontFamily: FONT.body, fontWeight: 700, fontSize: 11, letterSpacing: 1.5 }}><span>TRIP DISTANCE · MAX 800 KM</span><span>{telemetry.distance.toFixed(1)} KM</span></div><div style={{ height: 5, borderRadius: 99, background: C.border, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, telemetry.distance / MAX_LONG_DISTANCE_KM * 100)}%`, borderRadius: 99, background: C.accent, transition: "width .35s" }} /></div></div>}

        <div style={{ height: 200, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, flexShrink: 0 }}>
          <LiveMap active={isRacing} routePoints={route} />
        </div>
      </div>

      <div style={{ padding: "16px 20px", paddingBottom: 32, flexShrink: 0 }}>
        {isRacing ? (
          <button onClick={timedMode ? handleReset : () => { void handleStopRace(); }}
            style={{ width: "100%", padding: "18px", background: "transparent", border: `2px solid ${C.accent}`, borderRadius: 14, color: C.accent, fontFamily: FONT.display, fontSize: 22, letterSpacing: 6, cursor: "pointer" }}>
            {timedMode ? "✕ CANCEL RUN" : "⬛ STOP RUN"}
          </button>
        ) : guestRun ? (
          <div>
            <button onClick={handleReset}
              style={{ width: "100%", padding: "16px", background: C.accent, border: "none", borderRadius: 12, color: C.white, fontFamily: FONT.display, fontSize: 16, letterSpacing: 3, cursor: "pointer" }}>
              NEW RUN
            </button>
            <p style={{ marginTop: 10, textAlign: "center", color: C.muted, font: `11px ${FONT.body}` }}>Guest run · not saved</p>
          </div>
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
