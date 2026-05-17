// components/Speedometer.tsx

import React from "react";
import {
  polarToXY,
  arcPath,
  speedoArcColor,
} from "@/lib/utils";
import {
  C,
  FONT,
  SPEEDO_START_ANGLE,
  SPEEDO_END_ANGLE,
} from "@/lib/constants";
import type { SpeedUnit } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SpeedometerProps {
  /** Current speed in the chosen display unit (km/h or mph). */
  speed:    number;
  /** Maximum value the gauge represents (300 km/h or 200 mph). */
  maxSpeed: number;
  /** Display unit label shown beneath the readout. */
  unit:     SpeedUnit;
  /** Optional inline style for the wrapping element. */
  style?:   React.CSSProperties;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CX    = 100;  // SVG centre-x
const CY    = 100;  // SVG centre-y
const RANGE = SPEEDO_END_ANGLE - SPEEDO_START_ANGLE;  // 260°

/** Number of tick marks around the dial (0 … 30 → 31 ticks). */
const TICK_COUNT = 30;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function Speedometer({ speed, maxSpeed, unit, style }: SpeedometerProps) {
  const pct   = Math.min(Math.max(speed / maxSpeed, 0), 1);
  const angle = SPEEDO_START_ANGLE + pct * RANGE;

  // Needle tip and base points
  const tip  = polarToXY(CX, CY, 72, angle);
  const bL   = polarToXY(CX, CY, 10, angle + 90);
  const bR   = polarToXY(CX, CY, 10, angle - 90);

  // Arc colour transitions green → gold → red
  const arcColor = speedoArcColor(pct);

  // Build tick data once per render
  const ticks = buildTicks(maxSpeed);

  return (
    <svg
      viewBox="0 0 200 180"
      style={{ width: "100%", maxWidth: 340, ...style }}
      aria-label={`Speedometer: ${Math.round(speed)} ${unit === "mph" ? "mph" : "km/h"}`}
    >
      {/* ── Background track ── */}
      <path
        d={arcPath(CX, CY, 90, SPEEDO_START_ANGLE, SPEEDO_END_ANGLE)}
        fill="none"
        stroke={C.dim}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* ── Coloured progress arc ── */}
      {pct > 0.002 && (
        <path
          d={arcPath(CX, CY, 90, SPEEDO_START_ANGLE, angle)}
          fill="none"
          stroke={arcColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transition: "stroke 0.2s" }}
        />
      )}

      {/* ── Tick marks ── */}
      {ticks.map((tick) => (
        <line
          key={tick.index}
          x1={tick.inner.x}
          y1={tick.inner.y}
          x2={tick.outer.x}
          y2={tick.outer.y}
          stroke={tick.major ? C.text : C.dim}
          strokeWidth={tick.major ? 1.5 : 0.8}
        />
      ))}

      {/* ── Tick labels (major ticks only) ── */}
      {ticks
        .filter((t) => t.major)
        .map((tick) => {
          const lp = polarToXY(CX, CY, 68, tick.angle);
          return (
            <text
              key={`lbl-${tick.index}`}
              x={lp.x}
              y={lp.y}
              fill={C.muted}
              fontSize="7"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONT.mono}
            >
              {tick.label}
            </text>
          );
        })}

      {/* ── Needle ── */}
      <polygon
        points={`${tip.x},${tip.y} ${bL.x},${bL.y} ${bR.x},${bR.y}`}
        fill={C.accent}
        opacity="0.95"
        style={{ transition: "all 0.12s linear" }}
      />

      {/* ── Hub cap ── */}
      <circle cx={CX} cy={CY} r="7" fill={C.card} stroke={C.accent} strokeWidth="2" />
      <circle cx={CX} cy={CY} r="3" fill={C.accent} />

      {/* ── Digital speed readout ── */}
      <text
        x={CX}
        y="140"
        fill={C.text}
        fontSize="32"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT.display}
        letterSpacing="2"
        style={{ transition: "all 0.1s" }}
      >
        {Math.round(speed)}
      </text>

      {/* ── Unit label ── */}
      <text
        x={CX}
        y="158"
        fill={C.muted}
        fontSize="9"
        textAnchor="middle"
        fontFamily={FONT.body}
        fontWeight="700"
        letterSpacing="3"
      >
        {unit === "mph" ? "MPH" : "KM/H"}
      </text>
    </svg>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

interface TickData {
  index: number;
  angle: number;
  major: boolean;
  label: string;
  inner: { x: number; y: number };
  outer: { x: number; y: number };
}

function buildTicks(maxSpeed: number): TickData[] {
  return Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const angle = SPEEDO_START_ANGLE + (i / TICK_COUNT) * RANGE;
    const major = i % 5 === 0;
    return {
      index: i,
      angle,
      major,
      label: String(Math.round((i / TICK_COUNT) * maxSpeed)),
      inner: polarToXY(CX, CY, major ? 78 : 80, angle),
      outer: polarToXY(CX, CY, 88, angle),
    };
  });
}