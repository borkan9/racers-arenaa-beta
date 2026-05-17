// components/LiveMap.tsx

import React from "react";
import { C, FONT } from "@/lib/constants";
import type { RoutePoint } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LiveMapProps {
  /** Whether a race is actively running (shows LIVE badge + pulse). */
  active:      boolean;
  /** Ordered array of SVG-space route points recorded so far. */
  routePoints: RoutePoint[];
  /** Optional inline style for the outer container div. */
  style?:      React.CSSProperties;
}

// ─── SVG VIEWPORT ────────────────────────────────────────────────────────────

const VW = 400;
const VH = 300;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LiveMap({ active, routePoints, style }: LiveMapProps) {
  const last = routePoints[routePoints.length - 1] ?? null;

  // Build the SVG polyline points string once
  const polylinePoints = routePoints
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <div
      style={{
        position:     "relative",
        width:        "100%",
        height:       "100%",
        borderRadius: 12,
        overflow:     "hidden",
        background:   "#0D1117",
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* ── Grid lines ── */}
        <GridLines />

        {/* ── Road surface ── */}
        <RoadSurface />

        {/* ── Recorded route line ── */}
        {routePoints.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={C.accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray:  800,
              strokeDashoffset: 0,
              animation:        "track-draw 1.5s ease forwards",
            }}
          />
        )}

        {/* ── Start marker ── */}
        <StartMarker />

        {/* ── Live position pulse + dot ── */}
        {last !== null && (
          <LiveDot cx={last.x} cy={last.y} active={active} />
        )}
      </svg>

      {/* ── LIVE badge overlay ── */}
      {active && <LiveBadge />}

      {/* ── Footer note ── */}
      <MapFooter />
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function GridLines() {
  const hLines = Array.from({ length: 12 }, (_, i) => i * 28);
  const vLines = Array.from({ length: 16 }, (_, i) => i * 28);

  return (
    <g>
      {hLines.map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2={VW} y2={y} stroke="#161D26" strokeWidth="0.8" />
      ))}
      {vLines.map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2={VH} stroke="#161D26" strokeWidth="0.8" />
      ))}
    </g>
  );
}

function RoadSurface() {
  const path = "M40 260 Q80 240 120 220 Q180 190 220 160 Q270 120 310 100 Q350 80 380 60";
  return (
    <g>
      {/* Road base shadow */}
      <path d={path} fill="none" stroke="#1E2840" strokeWidth="18" strokeLinecap="round" />
      {/* Road surface */}
      <path d={path} fill="none" stroke="#243050" strokeWidth="14" strokeLinecap="round" />
    </g>
  );
}

function StartMarker() {
  return (
    <g>
      <circle cx="40" cy="260" r="7" fill={C.green} opacity="0.9" />
      <circle cx="40" cy="260" r="4" fill={C.green} />
      <text
        x="52"
        y="264"
        fill={C.green}
        fontSize="8"
        fontFamily={FONT.body}
        fontWeight="700"
      >
        START
      </text>
    </g>
  );
}

interface LiveDotProps {
  cx:     number;
  cy:     number;
  active: boolean;
}

function LiveDot({ cx, cy, active }: LiveDotProps) {
  return (
    <g>
      {active && (
        <circle
          cx={cx}
          cy={cy}
          r="10"
          fill={C.accent}
          opacity="0.25"
          style={{ animation: "pulse-ring 1.5s ease-in-out infinite" }}
        />
      )}
      <circle cx={cx} cy={cy} r="5" fill={C.accent} />
    </g>
  );
}

function LiveBadge() {
  return (
    <div
      style={{
        position:    "absolute",
        top:         10,
        right:       10,
        background:  `${C.accent}20`,
        border:      `1px solid ${C.accent}`,
        borderRadius: 6,
        padding:     "3px 10px",
        display:     "flex",
        alignItems:  "center",
        gap:         6,
      }}
    >
      <div
        style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   C.accent,
          animation:    "blink 1s step-end infinite",
        }}
      />
      <span
        style={{
          fontFamily:    FONT.body,
          fontWeight:    700,
          fontSize:      11,
          color:         C.accent,
          letterSpacing: 2,
        }}
      >
        LIVE
      </span>
    </div>
  );
}

function MapFooter() {
  return (
    <div
      style={{
        position:      "absolute",
        bottom:        10,
        left:          10,
        fontSize:      9,
        color:         C.muted,
        fontFamily:    FONT.mono,
        letterSpacing: 1,
      }}
    >
      MAP SIMULATION MODE
    </div>
  );
}