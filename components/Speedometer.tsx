// ─────────────────────────────────────────────────────────────
// CYBER STREET SPEEDOMETER — RACERS ARENA
// aggressive neon / AMG + Cyberpunk inspired
// replace your current Speedometer component with this
// ─────────────────────────────────────────────────────────────

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

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
  unit: SpeedUnit;
  style?: React.CSSProperties;
}

const CX = 100;
const CY = 100;
const RANGE = SPEEDO_END_ANGLE - SPEEDO_START_ANGLE;
const TICK_COUNT = 40;

export function Speedometer({
  speed,
  maxSpeed,
  unit,
  style,
}: SpeedometerProps) {
  const pct = Math.min(Math.max(speed / maxSpeed, 0), 1);

  const angle = SPEEDO_START_ANGLE + pct * RANGE;

  const tip = polarToXY(CX, CY, 70, angle);
  const bL = polarToXY(CX, CY, 9, angle + 90);
  const bR = polarToXY(CX, CY, 9, angle - 90);

  const glow = speedoArcColor(pct);

  const ticks = buildTicks(maxSpeed);

  return (
    <svg
      viewBox="0 0 200 190"
      style={{
        width: "100%",
        maxWidth: 380,
        overflow: "visible",
        filter: `drop-shadow(0 0 12px ${glow})`,
        ...style,
      }}
    >
      {/* OUTER RING */}
      <circle
        cx={CX}
        cy={CY}
        r="92"
        fill="none"
        stroke="#14141f"
        strokeWidth="10"
      />

      {/* GLOW TRACK */}
      <path
        d={arcPath(CX, CY, 88, SPEEDO_START_ANGLE, SPEEDO_END_ANGLE)}
        fill="none"
        stroke="#232336"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* ACTIVE ARC */}
      <path
        d={arcPath(CX, CY, 88, SPEEDO_START_ANGLE, angle)}
        fill="none"
        stroke={glow}
        strokeWidth="6"
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 10px ${glow})`,
          transition: "all .15s linear",
        }}
      />

      {/* INNER GLOW */}
      <circle
        cx={CX}
        cy={CY}
        r="60"
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.03)"
      />

      {/* TICKS */}
      {ticks.map((tick) => (
        <line
          key={tick.index}
          x1={tick.inner.x}
          y1={tick.inner.y}
          x2={tick.outer.x}
          y2={tick.outer.y}
          stroke={tick.major ? "#ffffff" : "#44445f"}
          strokeWidth={tick.major ? 2 : 1}
          opacity={tick.major ? 1 : 0.4}
        />
      ))}

      {/* LABELS */}
      {ticks
        .filter((t) => t.major)
        .map((tick) => {
          const p = polarToXY(CX, CY, 67, tick.angle);

          return (
            <text
              key={tick.index}
              x={p.x}
              y={p.y}
              fill="#8b8ba7"
              fontSize="7"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONT.mono}
            >
              {tick.label}
            </text>
          );
        })}

      {/* NEEDLE GLOW */}
      <polygon
        points={`${tip.x},${tip.y} ${bL.x},${bL.y} ${bR.x},${bR.y}`}
        fill={glow}
        style={{
          filter: `drop-shadow(0 0 10px ${glow})`,
          transition: "all .08s linear",
        }}
      />

      {/* HUB */}
      <circle
        cx={CX}
        cy={CY}
        r="10"
        fill="#0d0d14"
        stroke={glow}
        strokeWidth="3"
      />

      <circle
        cx={CX}
        cy={CY}
        r="4"
        fill={glow}
      />

      {/* SPEED */}
      <text
        x={CX}
        y="132"
        fill="#ffffff"
        fontSize="34"
        textAnchor="middle"
        fontFamily={FONT.display}
        fontWeight="900"
        letterSpacing="2"
        style={{
          filter: "drop-shadow(0 0 8px rgba(255,255,255,.2))",
        }}
      >
        {Math.round(speed)}
      </text>

      {/* UNIT */}
      <text
        x={CX}
        y="150"
        fill="#8b8ba7"
        fontSize="10"
        textAnchor="middle"
        fontFamily={FONT.body}
        letterSpacing="5"
      >
        {unit === "mph" ? "MPH" : "KM/H"}
      </text>

      {/* BOOST BAR */}
      <rect
        x="35"
        y="170"
        width="130"
        height="5"
        rx="999"
        fill="#181824"
      />

      <rect
        x="35"
        y="170"
        width={130 * pct}
        height="5"
        rx="999"
        fill={glow}
        style={{
          transition: "all .1s linear",
          filter: `drop-shadow(0 0 8px ${glow})`,
        }}
      />
    </svg>
  );
}

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
    const angle =
      SPEEDO_START_ANGLE + (i / TICK_COUNT) * RANGE;

    const major = i % 5 === 0;

    return {
      index: i,
      angle,
      major,
      label: String(
        Math.round((i / TICK_COUNT) * maxSpeed)
      ),
      inner: polarToXY(
        CX,
        CY,
        major ? 74 : 78,
        angle
      ),
      outer: polarToXY(CX, CY, 88, angle),
    };
  });
}