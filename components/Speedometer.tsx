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

const CX = 120;
const CY = 118;
const RANGE = SPEEDO_END_ANGLE - SPEEDO_START_ANGLE;
const TICK_COUNT = 36;

export function Speedometer({
  speed,
  maxSpeed,
  unit,
  style,
}: SpeedometerProps) {
  const pct = Math.min(Math.max(speed / maxSpeed, 0), 1);
  const angle = SPEEDO_START_ANGLE + pct * RANGE;
  const glow = speedoArcColor(pct);

  const tip = polarToXY(CX, CY, 82, angle);
  const bL = polarToXY(CX, CY, 12, angle + 90);
  const bR = polarToXY(CX, CY, 12, angle - 90);

  const ticks = buildTicks(maxSpeed);

  return (
    <svg
      viewBox="0 0 240 230"
      style={{
        width: "100%",
        maxWidth: 430,
        overflow: "visible",
        ...style,
      }}
      aria-label={`Speedometer: ${Math.round(speed)} ${unit === "mph" ? "mph" : "km/h"}`}
      role="img"
    >
      <defs>
        <linearGradient id="ra-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#242433" />
          <stop offset="50%" stopColor="#0F1017" />
          <stop offset="100%" stopColor="#3B3B50" />
        </linearGradient>

        <linearGradient id="ra-needle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB02E" />
          <stop offset="55%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#C91E00" />
        </linearGradient>

        <radialGradient id="ra-core" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="65%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        <filter id="ra-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.4 0 0 0
              0 0 0.1 0 0
              0 0 0 1 0"
          />
        </filter>

        <filter id="ra-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect
        x="18"
        y="18"
        width="204"
        height="194"
        rx="24"
        fill="#090A10"
        stroke="rgba(255,255,255,0.06)"
      />

      <path
        d={arcPath(CX, CY, 96, SPEEDO_START_ANGLE, SPEEDO_END_ANGLE)}
        fill="none"
        stroke="url(#ra-ring)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d={arcPath(CX, CY, 88, SPEEDO_START_ANGLE, SPEEDO_END_ANGLE)}
        fill="none"
        stroke="#171824"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <path
        d={arcPath(CX, CY, 88, SPEEDO_START_ANGLE, angle)}
        fill="none"
        stroke={glow}
        strokeWidth="8"
        strokeLinecap="round"
        style={{
          filter: "url(#ra-glow)",
          transition: "stroke 0.15s linear",
        }}
      />

      <path
        d={arcPath(CX, CY, 88, SPEEDO_START_ANGLE, angle)}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          filter: "url(#ra-soft-glow)",
          transition: "stroke 0.15s linear",
        }}
      />

      <circle cx={CX} cy={CY} r="58" fill="url(#ra-core)" />

      {ticks.map((tick) => (
        <line
          key={tick.index}
          x1={tick.inner.x}
          y1={tick.inner.y}
          x2={tick.outer.x}
          y2={tick.outer.y}
          stroke={tick.major ? "#F4F1EA" : "#4B4B63"}
          strokeWidth={tick.major ? 2 : 1}
          strokeLinecap="round"
          opacity={tick.major ? 1 : 0.45}
        />
      ))}

      {ticks
        .filter((t) => t.major)
        .map((tick) => {
          const p = polarToXY(CX, CY, 72, tick.angle);
          return (
            <text
              key={`lbl-${tick.index}`}
              x={p.x}
              y={p.y}
              fill="#8B8DA7"
              fontSize="7"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONT.mono}
            >
              {tick.label}
            </text>
          );
        })}

      <polygon
        points={`${tip.x},${tip.y} ${bL.x},${bL.y} ${bR.x},${bR.y}`}
        fill="url(#ra-needle)"
        style={{
          filter: "url(#ra-glow)",
          transition: "all 0.12s linear",
        }}
      />

      <circle cx={CX} cy={CY} r="12" fill="#0B0C12" stroke={glow} strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r="5" fill={glow} />

      <text
        x={CX}
        y="150"
        fill={C.text}
        fontSize="40"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT.display}
        fontWeight="900"
        letterSpacing="1"
        style={{
          filter: "drop-shadow(0 0 10px rgba(255,255,255,0.14))",
        }}
      >
        {Math.round(speed)}
      </text>

      <text
        x={CX}
        y="172"
        fill={C.muted}
        fontSize="9"
        textAnchor="middle"
        fontFamily={FONT.body}
        fontWeight="700"
        letterSpacing="4"
      >
        {unit === "mph" ? "MPH" : "KM/H"}
      </text>

      <text
        x={CX}
        y="192"
        fill={C.dim}
        fontSize="7"
        textAnchor="middle"
        fontFamily={FONT.mono}
        letterSpacing="5"
      >
        NO LIFT • NO MERCY
      </text>

      <rect
        x="54"
        y="202"
        width="132"
        height="6"
        rx="999"
        fill="#161824"
      />
      <rect
        x="54"
        y="202"
        width={132 * pct}
        height="6"
        rx="999"
        fill={glow}
        style={{
          filter: `drop-shadow(0 0 9px ${glow})`,
          transition: "all 0.1s linear",
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
    const angle = SPEEDO_START_ANGLE + (i / TICK_COUNT) * RANGE;
    const major = i % 6 === 0;

    return {
      index: i,
      angle,
      major,
      label: String(Math.round((i / TICK_COUNT) * maxSpeed)),
      inner: polarToXY(CX, CY, major ? 79 : 82, angle),
      outer: polarToXY(CX, CY, major ? 90 : 86, angle),
    };
  });
}