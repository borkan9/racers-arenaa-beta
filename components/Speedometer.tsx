import React from "react";

interface SpeedometerProps {
  speed: number;
  maxSpeed?: number;
  unit?: string;
  style?: React.CSSProperties;
}

export function Speedometer({
  speed,
  maxSpeed = 420,
  unit = "KM/H",
  style,
}: SpeedometerProps) {
  const percentage = Math.min(
    Math.max(speed / maxSpeed, 0),
    1
  );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 12px",
        color: "white",
        ...style,
      }}
    >
      {/* SPEED */}
      <div
        style={{
          fontSize: "clamp(110px, 30vw, 220px)",
          fontWeight: 900,
          lineHeight: 0.9,
          fontFamily:
            "'Inter', 'Arial Black', sans-serif",
          letterSpacing: "-6px",
          color: "#ffffff",
          textShadow:
            "0 0 24px rgba(255,255,255,0.08)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(speed)}
      </div>

      {/* UNIT */}
      <div
        style={{
          marginTop: 8,
          fontSize: "clamp(18px, 4vw, 28px)",
          fontWeight: 700,
          letterSpacing: "10px",
          color: "#8f8f98",
          fontFamily:
            "'Inter', sans-serif",
        }}
      >
        {unit}
      </div>

      {/* PROGRESS BAR */}
      <div
        style={{
          width: "92%",
          maxWidth: 520,
          height: 16,
          marginTop: 38,
          borderRadius: 999,
          background:
            "rgba(255,255,255,0.08)",
          overflow: "hidden",
          border:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: `${percentage * 100}%`,
            height: "100%",
            borderRadius: 999,
            background:
              speed < 120
                ? "#30d158"
                : speed < 220
                ? "#ff9f0a"
                : "#ff3b30",
            transition:
              "width 0.12s linear, background 0.2s ease",
            boxShadow:
              speed > 220
                ? "0 0 18px rgba(255,59,48,.7)"
                : speed > 120
                ? "0 0 14px rgba(255,159,10,.5)"
                : "0 0 12px rgba(48,209,88,.4)",
          }}
        />
      </div>

      {/* SPEED STAGES */}
      <div
        style={{
          width: "92%",
          maxWidth: 520,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          color: "#555",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily:
            "'Inter', sans-serif",
        }}
      >
        <span>0</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>400+</span>
      </div>
    </div>
  );
}