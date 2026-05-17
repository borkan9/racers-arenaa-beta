// screens/RaceScreen.tsx

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion } from "framer-motion";
import { Speedometer }        from "@/components/Speedometer";
import { LiveMap }            from "@/components/LiveMap";
import { CountdownOverlay }   from "@/components/CountdownOverlay";
import { useTelemetry }       from "@/hooks/useTelemetry";
import {
  C,
  FONT,
  RACE_MODES,
  COUNTDOWN_OPTIONS,
  SPEEDO_MAX_KMH,
  SPEEDO_MAX_MPH,
  TIMER_INTERVAL_MS,
} from "@/lib/constants";
import { fmtTime, fmtSpeed, fmtDist, convertSpeed } from "@/lib/utils";
import type {
  RacePhase,
  RaceModeId,
  SpeedUnit,
  CountdownSeconds,
  TelemetrySnapshot,
  RoutePoint,
  ScreenId,
} from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RaceScreenProps {
  onExit: (dest: ScreenId) => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function RaceScreen({ onExit }: RaceScreenProps) {
  // ── Config state (setup screen) ───────────────────────────────────────────
  const [raceMode,   setRaceMode]   = useState<RaceModeId>("free");
  const [unit,       setUnit]       = useState<SpeedUnit>("kmh");
  const [countdown,  setCountdown]  = useState<CountdownSeconds>(3);
  const [isPrivate,  setIsPrivate]  = useState(false);

  // ── Race lifecycle ────────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<RacePhase>("setup");
  const [startTime,  setStartTime]  = useState<number | null>(null);
  const [elapsed,    setElapsed]    = useState(0);

  // ── Telemetry ─────────────────────────────────────────────────────────────
  const [telemetry,  setTelemetry]  = useState<TelemetrySnapshot>({
    speed:    0,
    topSpeed: 0,
    distance: 0,
    elapsed:  0,
    accel:    0,
    gForce:   0,
    lat:      null,
    lng:      null,
  });
  const [route, setRoute] = useState<RoutePoint[]>([]);

  // ── Timer ref ─────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Telemetry callbacks (stable refs) ────────────────────────────────────
  const handleUpdate = useCallback((snapshot: TelemetrySnapshot) => {
    setTelemetry(snapshot);
  }, []);

  const handleRoutePoint = useCallback((point: RoutePoint) => {
    setRoute((prev) =>
      prev.length >= 500 ? [...prev.slice(-499), point] : [...prev, point],
    );
  }, []);

  // ── Wire up telemetry hook ────────────────────────────────────────────────
  useTelemetry({
    enabled:   phase === "racing",
    startTime,
    simulate:  true,           // set to false to use real GPS
    callbacks: {
      onUpdate:     handleUpdate,
      onRoutePoint: handleRoutePoint,
    },
  });

  // ── Wall-clock timer (50 ms cadence for smooth display) ──────────────────
  useEffect(() => {
    if (phase === "racing" && startTime !== null) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, TIMER_INTERVAL_MS);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (phase !== "finished") {
        setElapsed(0);
      }
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [phase, startTime]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCountdownComplete = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setPhase("racing");
  }, []);

  const handleStopRace = useCallback(() => {
    setPhase("finished");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setStartTime(null);
    setElapsed(0);
    setRoute([]);
    setTelemetry({
      speed: 0, topSpeed: 0, distance: 0,
      elapsed: 0, accel: 0, gForce: 0,
      lat: null, lng: null,
    });
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const displaySpeed    = convertSpeed(telemetry.speed,    unit);
  const displayTopSpeed = convertSpeed(telemetry.topSpeed, unit);
  const maxSpeedo       = unit === "mph" ? SPEEDO_MAX_MPH : SPEEDO_MAX_KMH;

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <SetupScreen
        raceMode={raceMode}   setRaceMode={setRaceMode}
        unit={unit}           setUnit={setUnit}
        countdown={countdown} setCountdown={setCountdown}
        isPrivate={isPrivate} setIsPrivate={setIsPrivate}
        onBack={() => onExit("home")}
        onStart={() => setPhase("countdown")}
      />
    );
  }

  if (phase === "countdown") {
    return (
      <CountdownOverlay
        from={countdown}
        onComplete={handleCountdownComplete}
      />
    );
  }

  // phase === "racing" | "finished"
  return (
    <LiveRaceView
      phase={phase}
      elapsed={elapsed}
      telemetry={telemetry}
      route={route}
      unit={unit}
      displaySpeed={displaySpeed}
      displayTopSpeed={displayTopSpeed}
      maxSpeedo={maxSpeedo}
      onStop={handleStopRace}
      onReset={handleReset}
      onExit={onExit}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

interface SetupScreenProps {
  raceMode:    RaceModeId;
  setRaceMode: (m: RaceModeId) => void;
  unit:        SpeedUnit;
  setUnit:     (u: SpeedUnit) => void;
  countdown:   CountdownSeconds;
  setCountdown:(c: CountdownSeconds) => void;
  isPrivate:   boolean;
  setIsPrivate:(v: boolean) => void;
  onBack:      () => void;
  onStart:     () => void;
}

function SetupScreen({
  raceMode, setRaceMode,
  unit, setUnit,
  countdown, setCountdown,
  isPrivate, setIsPrivate,
  onBack, onStart,
}: SetupScreenProps) {
  return (
    <div
      style={{
        minHeight:  "100vh",
        background: C.bg,
        display:    "flex",
        flexDirection: "column",
        padding:    20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display:     "flex",
          alignItems:  "center",
          gap:         12,
          marginBottom: 32,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background:   "none",
            border:       `1px solid ${C.border}`,
            borderRadius: 8,
            padding:      "8px 16px",
            color:        C.muted,
            cursor:       "pointer",
            fontFamily:   FONT.body,
            fontWeight:   600,
            fontSize:     13,
            letterSpacing: 1,
          }}
        >
          ← BACK
        </button>
        <h1
          className="display"
          style={{ fontSize: 28, letterSpacing: 4, color: C.text }}
        >
          NEW RUN
        </h1>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Race Mode */}
        <SectionLabel>RACE MODE</SectionLabel>
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "1fr 1fr",
            gap:                 10,
            marginBottom:        24,
          }}
        >
          {RACE_MODES.map((m) => (
            <OptionButton
              key={m.id}
              label={m.label}
              selected={raceMode === m.id}
              onClick={() => setRaceMode(m.id as RaceModeId)}
            />
          ))}
        </div>

        {/* Speed Unit */}
        <SectionLabel>UNIT</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {(["kmh", "mph"] as SpeedUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                flex:          1,
                padding:       "12px",
                background:    unit === u ? `${C.accent}15` : C.card,
                border:        `1px solid ${unit === u ? C.accent : C.border}`,
                borderRadius:  10,
                color:         unit === u ? C.accent : C.muted,
                fontFamily:    FONT.display,
                fontSize:      20,
                letterSpacing: 3,
                cursor:        "pointer",
                transition:    "all 0.2s",
              }}
            >
              {u === "kmh" ? "KM/H" : "MPH"}
            </button>
          ))}
        </div>

        {/* Countdown */}
        <SectionLabel>COUNTDOWN</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {COUNTDOWN_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCountdown(c as CountdownSeconds)}
              style={{
                flex:          1,
                padding:       "14px",
                background:    countdown === c ? `${C.accent}15` : C.card,
                border:        `1px solid ${countdown === c ? C.accent : C.border}`,
                borderRadius:  10,
                color:         countdown === c ? C.accent : C.muted,
                fontFamily:    FONT.display,
                fontSize:      28,
                letterSpacing: 2,
                cursor:        "pointer",
                transition:    "all 0.2s",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Private toggle */}
        <div
          style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            background:     C.card,
            border:         `1px solid ${C.border}`,
            borderRadius:   12,
            padding:        "14px 16px",
            marginBottom:   36,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize:   14,
                color:      C.text,
              }}
            >
              Private Run
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize:   12,
                color:      C.muted,
                marginTop:  2,
              }}
            >
              Won't appear on leaderboard
            </div>
          </div>
          <ToggleSwitch checked={isPrivate} onChange={setIsPrivate} />
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          style={{
            width:         "100%",
            padding:       "20px",
            background:    C.accent,
            border:        "none",
            borderRadius:  14,
            color:         C.white,
            fontFamily:    FONT.display,
            fontSize:      24,
            letterSpacing: 6,
            cursor:        "pointer",
            animation:     "glow-pulse 2s ease-in-out infinite",
            marginBottom:  12,
          }}
        >
          ▶ START RUN
        </button>

        <div
          style={{
            textAlign:     "center",
            fontSize:      11,
            color:         C.muted,
            fontFamily:    FONT.body,
            letterSpacing: 2,
          }}
        >
          GPS + ACCELEROMETER + GYROSCOPE ACTIVE
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE RACE VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface LiveRaceViewProps {
  phase:            RacePhase;
  elapsed:          number;
  telemetry:        TelemetrySnapshot;
  route:            RoutePoint[];
  unit:             SpeedUnit;
  displaySpeed:     number;
  displayTopSpeed:  number;
  maxSpeedo:        number;
  onStop:           () => void;
  onReset:          () => void;
  onExit:           (dest: ScreenId) => void;
}

function LiveRaceView({
  phase,
  elapsed,
  telemetry,
  route,
  unit,
  displaySpeed,
  displayTopSpeed,
  maxSpeedo,
  onStop,
  onReset,
  onExit,
}: LiveRaceViewProps) {
  const isRacing   = phase === "racing";
  const isFinished = phase === "finished";

  return (
    <div
      style={{
        minHeight:     "100vh",
        background:    C.bg,
        display:       "flex",
        flexDirection: "column",
        overflow:      "hidden",
      }}
    >
      {/* ── Status bar ── */}
      <StatusBar
        isRacing={isRacing}
        elapsed={elapsed}
        onSaveExit={isFinished ? () => onExit("history") : undefined}
      />

      {/* ── Main telemetry area ── */}
      <div
        style={{
          flex:    1,
          display: "flex",
          flexDirection: "column",
          padding: "16px 20px",
          gap:     16,
          overflow: "hidden",
        }}
      >
        {/* Speedometer */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Speedometer
            speed={displaySpeed}
            maxSpeed={maxSpeedo}
            unit={unit}
            style={{ maxWidth: 340 }}
          />
        </div>

        {/* Stats grid */}
        <StatsGrid
          telemetry={telemetry}
          displayTopSpeed={displayTopSpeed}
          unit={unit}
        />

        {/* Live map */}
        <div
          style={{
            height:       160,
            borderRadius: 12,
            overflow:     "hidden",
            border:       `1px solid ${C.border}`,
            flexShrink:   0,
          }}
        >
          <LiveMap active={isRacing} routePoints={route} />
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ padding: "16px 20px", paddingBottom: 32 }}>
        {isRacing ? (
          <StopButton onClick={onStop} />
        ) : (
          <FinishedControls
            onReset={onReset}
            onViewHistory={() => onExit("history")}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BAR
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBarProps {
  isRacing:    boolean;
  elapsed:     number;
  onSaveExit?: () => void;
}

function StatusBar({ isRacing, elapsed, onSaveExit }: StatusBarProps) {
  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        padding:        "12px 20px",
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}
    >
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width:        8,
            height:       8,
            borderRadius: "50%",
            background:   isRacing ? C.accent : C.muted,
            animation:    isRacing ? "blink 1s step-end infinite" : "none",
          }}
        />
        <span
          className="display"
          style={{
            fontSize:      16,
            letterSpacing: 4,
            color:         isRacing ? C.accent : C.muted,
          }}
        >
          {isRacing ? "LIVE RACE" : "RUN COMPLETE"}
        </span>
      </div>

      {/* Timer */}
      <div
        className="display"
        style={{
          fontSize:      28,
          letterSpacing: 3,
          color:         isRacing ? C.text : C.gold,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtTime(elapsed)}
      </div>

      {/* Save button (finished only) */}
      {onSaveExit ? (
        <button
          onClick={onSaveExit}
          style={{
            background:    C.card,
            border:        `1px solid ${C.border}`,
            borderRadius:  8,
            padding:       "8px 16px",
            color:         C.text,
            cursor:        "pointer",
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      12,
            letterSpacing: 1,
          }}
        >
          SAVE & EXIT
        </button>
      ) : (
        // Spacer so timer stays centred
        <div style={{ width: 80 }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS GRID
// ─────────────────────────────────────────────────────────────────────────────

interface StatsGridProps {
  telemetry:       TelemetrySnapshot;
  displayTopSpeed: number;
  unit:            SpeedUnit;
}

function StatsGrid({ telemetry, displayTopSpeed, unit }: StatsGridProps) {
  const stats = [
    {
      label: "TOP SPEED",
      val:   `${Math.round(displayTopSpeed)}`,
      sub:   unit === "mph" ? "mph" : "km/h",
      hot:   false,
      gold:  true,
    },
    {
      label: "DISTANCE",
      val:   fmtDist(telemetry.distance, unit),
      sub:   "",
      hot:   false,
      gold:  false,
    },
    {
      label: "ACCEL",
      val:   telemetry.accel.toFixed(2),
      sub:   "m/s²",
      hot:   false,
      gold:  false,
    },
    {
      label: "G-FORCE",
      val:   telemetry.gForce.toFixed(2),
      sub:   "G",
      hot:   telemetry.gForce > 1.0,
      gold:  false,
    },
  ] as const;

  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap:                 10,
        flexShrink:          0,
      }}
    >
      {stats.map((s) => (
        <StatBox
          key={s.label}
          label={s.label}
          value={s.val}
          sub={s.sub}
          hot={s.hot}
          gold={s.gold}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STOP BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function StopButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:         "100%",
        padding:       "18px",
        background:    hovered ? `${C.accent}15` : "transparent",
        border:        `2px solid ${C.accent}`,
        borderRadius:  14,
        color:         C.accent,
        fontFamily:    FONT.display,
        fontSize:      22,
        letterSpacing: 6,
        cursor:        "pointer",
        transition:    "background 0.2s",
      }}
    >
      ⬛ STOP RUN
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINISHED CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

interface FinishedControlsProps {
  onReset:        () => void;
  onViewHistory:  () => void;
}

function FinishedControls({ onReset, onViewHistory }: FinishedControlsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <button
        onClick={onReset}
        style={{
          padding:       "16px",
          background:    "transparent",
          border:        `1px solid ${C.border}`,
          borderRadius:  12,
          color:         C.muted,
          fontFamily:    FONT.display,
          fontSize:      16,
          letterSpacing: 3,
          cursor:        "pointer",
        }}
      >
        NEW RUN
      </button>
      <button
        onClick={onViewHistory}
        style={{
          padding:       "16px",
          background:    C.accent,
          border:        "none",
          borderRadius:  12,
          color:         C.white,
          fontFamily:    FONT.display,
          fontSize:      16,
          letterSpacing: 3,
          cursor:        "pointer",
        }}
      >
        VIEW HISTORY
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display:       "block",
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: 3,
        color:         C.muted,
        marginBottom:  12,
        fontFamily:    FONT.body,
      }}
    >
      {children}
    </label>
  );
}

interface OptionButtonProps {
  label:    string;
  selected: boolean;
  onClick:  () => void;
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       "14px 16px",
        background:    selected ? `${C.accent}15` : C.card,
        border:        `1px solid ${selected ? C.accent : C.border}`,
        borderRadius:  10,
        color:         selected ? C.text : C.muted,
        fontFamily:    FONT.body,
        fontWeight:    700,
        fontSize:      14,
        letterSpacing: 1,
        cursor:        "pointer",
        transition:    "all 0.2s",
        textAlign:     "left",
      }}
    >
      {label}
    </button>
  );
}

interface ToggleSwitchProps {
  checked:  boolean;
  onChange: (v: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width:        50,
        height:       28,
        borderRadius: 14,
        border:       "none",
        cursor:       "pointer",
        background:   checked ? C.accent : C.dim,
        transition:   "background 0.25s",
        position:     "relative",
        flexShrink:   0,
      }}
    >
      <div
        style={{
          position:     "absolute",
          top:          3,
          left:         checked ? 24 : 3,
          width:        22,
          height:       22,
          borderRadius: "50%",
          background:   C.white,
          transition:   "left 0.25s",
        }}
      />
    </button>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  sub:   string;
  hot:   boolean;
  gold:  boolean;
}

function StatBox({ label, value, sub, hot, gold }: StatBoxProps) {
  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 10,
        padding:      "12px 10px",
        textAlign:    "center",
      }}
    >
      <div
        style={{
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: 2,
          color:         C.muted,
          marginBottom:  6,
          fontFamily:    FONT.body,
        }}
      >
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 22,
          color:    hot ? C.accent : gold ? C.gold : C.text,
          letterSpacing: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: FONT.body }}>
          {sub}
        </div>
      )}
    </div>
  );
}