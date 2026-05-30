import React from "react";

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
  redline?: number;
}

function Gauge({
  value,
  min,
  max,
  label,
  unit,
  size = 320,
  redline,
}: GaugeProps) {
  const center = size / 2;
  const radius = size * 0.39;

  const startAngle = -130;
  const endAngle = 130;

  const percentage = Math.min(
    Math.max((value - min) / (max - min), 0),
    1
  );

  const angle =
    startAngle +
    percentage * (endAngle - startAngle);

  const needleLength = radius - 26;

  const rad = (angle * Math.PI) / 180;

  const needleX =
    center + needleLength * Math.cos(rad);

  const needleY =
    center + needleLength * Math.sin(rad);

  const ticks = [];

  const totalTicks = 56;

  for (let i = 0; i <= totalTicks; i++) {
    const tickPercent = i / totalTicks;

    const tickAngle =
      startAngle +
      tickPercent * (endAngle - startAngle);

    const tickRad =
      (tickAngle * Math.PI) / 180;

    const isMajor = i % 7 === 0;

    const outerRadius = radius;

    const innerRadius =
      radius - (isMajor ? 20 : 10);

    const x1 =
      center +
      innerRadius * Math.cos(tickRad);

    const y1 =
      center +
      innerRadius * Math.sin(tickRad);

    const x2 =
      center +
      outerRadius * Math.cos(tickRad);

    const y2 =
      center +
      outerRadius * Math.sin(tickRad);

    const tickValue = Math.round(
      min + tickPercent * (max - min)
    );

    const isRedline =
      redline !== undefined &&
      tickValue >= redline;

    ticks.push(
      <g key={i}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={
            isRedline ? "#ff2d2d" : "#f2f2f2"
          }
          strokeWidth={isMajor ? 3 : 1.2}
          strokeLinecap="round"
          opacity={isMajor ? 1 : 0.45}
        />

        {isMajor && (
          <text
            x={
              center +
              (radius - 40) *
                Math.cos(tickRad)
            }
            y={
              center +
              (radius - 40) *
                Math.sin(tickRad)
            }
            fill={
              isRedline ? "#ff2d2d" : "#ffffff"
            }
            fontSize="18"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
          >
            {tickValue}
          </text>
        )}
      </g>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* OUTER METAL RING */}
        <circle
          cx={center}
          cy={center}
          r={radius + 14}
          fill="#050505"
          stroke="#2d2d2d"
          strokeWidth="6"
        />

        {/* INNER FACE */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#0c0c0f"
        />

        {/* GLOW */}
        <circle
          cx={center}
          cy={center}
          r={radius - 3}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="2"
        />

        {/* TICKS */}
        {ticks}

        {/* NEEDLE SHADOW */}
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* NEEDLE */}
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
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
          cx={center}
          cy={center}
          r="12"
          fill="#111"
          stroke="#ff3b30"
          strokeWidth="4"
        />

        <circle
          cx={center}
          cy={center}
          r="5"
          fill="#ff3b30"
        />

        {/* DIGITAL VALUE */}
        <text
          x={center}
          y={center + 55}
          fill="#ffffff"
          fontSize="42"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontWeight="900"
          letterSpacing="1"
        >
          {Math.round(value)}
        </text>

        {/* UNIT */}
        {unit && (
          <text
            x={center}
            y={center + 88}
            fill="#777"
            fontSize="17"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            letterSpacing="5"
          >
            {unit}
          </text>
        )}

        {/* LABEL */}
        <text
          x={center}
          y={center + 115}
          fill="#555"
          fontSize="14"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          letterSpacing="4"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

interface ClusterProps {
  speed: number;
  rpm: number;
}

export default function DualGaugeCluster({
  speed,
  rpm,
}: ClusterProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 50,
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at center, #111 0%, #000 70%)",
        padding: 30,
        flexWrap: "wrap",
      }}
    >
      {/* RPM */}
      <Gauge
        value={rpm}
        min={0}
        max={11}
        redline={9}
        label="RPM x1000"
      />

      {/* SPEED */}
      <Gauge
        value={speed}
        min={0}
        max={420}
        label="TOP SPEED"
        unit="KM/H"
      />
    </div>
  );
}