import React from "react";

interface SpeedometerProps {
  speed: number;
  maxSpeed?: number;
  unit?: string;
  style?: React.CSSProperties;
}

const SIZE = 340;

const CENTER = SIZE / 2;

const START_ANGLE = -130;
const END_ANGLE = 130;

const RPM_MAX = 11;
const SPEED_MAX_DEFAULT = 420;

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
) {
  const rad = (angle * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function Gauge({
  value,
  max,
  label,
  unit,
  redline,
}: {
  value: number;
  max: number;
  label: string;
  unit?: string;
  redline?: number;
}) {
  const percentage = Math.min(
    Math.max(value / max, 0),
    1
  );

  const angle =
    START_ANGLE +
    percentage * (END_ANGLE - START_ANGLE);

  const needle = polarToCartesian(
    CENTER,
    CENTER,
    108,
    angle
  );

  const ticks = [];

  const totalTicks = 56;

  for (let i = 0; i <= totalTicks; i++) {
    const tickPercent = i / totalTicks;

    const tickAngle =
      START_ANGLE +
      tickPercent *
        (END_ANGLE - START_ANGLE);

    const outer = polarToCartesian(
      CENTER,
      CENTER,
      132,
      tickAngle
    );

    const inner = polarToCartesian(
      CENTER,
      CENTER,
      i % 7 === 0 ? 106 : 118,
      tickAngle
    );

    const labelPos = polarToCartesian(
      CENTER,
      CENTER,
      88,
      tickAngle
    );

    const tickValue = Math.round(
      tickPercent * max
    );

    const isMajor = i % 7 === 0;

    const isRedline =
      redline !== undefined &&
      tickValue >= redline;

    ticks.push(
      <g key={i}>
        <line
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          stroke={
            isRedline
              ? "#ff2d2d"
              : "#ffffff"
          }
          strokeWidth={isMajor ? 3 : 1.2}
          opacity={isMajor ? 1 : 0.35}
          strokeLinecap="round"
        />

        {isMajor && (
          <text
            x={labelPos.x}
            y={labelPos.y}
            fill={
              isRedline
                ? "#ff2d2d"
                : "#ffffff"
            }
            fontSize="18"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Inter, sans-serif"
          >
            {tickValue}
          </text>
        )}
      </g>
    );
  }

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
    >
      {/* OUTER RING */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r="146"
        fill="#050505"
        stroke="#2b2b2b"
        strokeWidth="7"
      />

      {/* INNER FACE */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r="134"
        fill="#0b0b0d"
      />

      {/* INNER SHADOW */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r="128"
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="3"
      />

      {/* TICKS */}
      {ticks}

      {/* NEEDLE SHADOW */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={needle.x}
        y2={needle.y}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* NEEDLE */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={needle.x}
        y2={needle.y}
        stroke="#ff3b30"
        strokeWidth="5"
        strokeLinecap="round"
        style={{
          transition:
            "all 0.08s linear",
        }}
      />

      {/* NEEDLE CENTER */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r="13"
        fill="#111"
        stroke="#ff3b30"
        strokeWidth="4"
      />

      <circle
        cx={CENTER}
        cy={CENTER}
        r="5"
        fill="#ff3b30"
      />

      {/* VALUE */}
      <text
        x={CENTER}
        y={CENTER + 58}
        fill="#ffffff"
        fontSize="44"
        textAnchor="middle"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        letterSpacing="1"
      >
        {Math.round(value)}
      </text>

      {/* UNIT */}
      {unit && (
        <text
          x={CENTER}
          y={CENTER + 92}
          fill="#888"
          fontSize="16"
          textAnchor="middle"
          letterSpacing="5"
          fontFamily="Inter, sans-serif"
        >
          {unit}
        </text>
      )}

      {/* LABEL */}
      <text
        x={CENTER}
        y={CENTER + 118}
        fill="#555"
        fontSize="13"
        textAnchor="middle"
        letterSpacing="4"
        fontFamily="Inter, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

export function Speedometer({
  speed,
  maxSpeed = SPEED_MAX_DEFAULT,
  unit = "KM/H",
  style,
}: SpeedometerProps) {
  const fakeRPM =
    Math.min(
      2 +
        (speed / maxSpeed) *
          RPM_MAX,
      RPM_MAX
    );

  return (
    <div
      style={{
        display: "flex",
        gap: 40,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        padding: 20,
        width: "100%",
        ...style,
      }}
    >
      {/* RPM */}
      <Gauge
        value={fakeRPM}
        max={11}
        redline={9}
        label="RPM x1000"
      />

      {/* SPEED */}
      <Gauge
        value={speed}
        max={maxSpeed}
        label="TOP SPEED"
        unit={unit}
      />
    </div>
  );
}