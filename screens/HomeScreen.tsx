// screens/HomeScreen.tsx

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Speedometer } from "@/components/Speedometer";
import { C, FONT, DEMO_SPEED_INTERVAL_MS, SPEEDO_MAX_KMH } from "@/lib/constants";
import { MOCK_RACERS } from "@/lib/mockData";
import type { ScreenId } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

// ─── DEMO SPEEDOMETER HOOK ────────────────────────────────────────────────────

function useDemoSpeed(): number {
  const [speed, setSpeed] = useState(0);
  const dirRef            = React.useRef<1 | -1>(1);

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed((prev) => {
        const next = prev + dirRef.current * (2 + Math.random() * 4);
        if (next >= 260) { dirRef.current = -1; return 260; }
        if (next <= 0)   { dirRef.current =  1; return 0;   }
        return next;
      });
    }, DEMO_SPEED_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return speed;
}

// ─── QUICK STATS ──────────────────────────────────────────────────────────────

const QUICK_STATS = [
  { val: "6",   label: "RACERS"   },
  { val: "330", label: "TOP KM/H" },
  { val: "112", label: "MAX RUNS" },
] as const;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const demoSpeed = useDemoSpeed();
  const topThree  = MOCK_RACERS.slice(0, 3);

  return (
    <div style={{ minHeight: "100%", background: C.bg }}>

      {/* ── Hero ── */}
      <HeroSection demoSpeed={demoSpeed} onStartRace={() => onNavigate("raceScreen")} />

      {/* ── Quick stats ── */}
      <div style={{ padding: "0 20px 20px" }}>
        <QuickStats />

        {/* ── Top racers preview ── */}
        <TopRacersPreview
          racers={topThree}
          onViewAll={() => onNavigate("board")}
        />
      </div>
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────

interface HeroSectionProps {
  demoSpeed:    number;
  onStartRace:  () => void;
}

function HeroSection({ demoSpeed, onStartRace }: HeroSectionProps) {
  return (
    <div
      style={{
        padding:   "40px 20px 24px",
        textAlign: "center",
        position:  "relative",
        overflow:  "hidden",
      }}
    >
      {/* Carbon-fibre background texture */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          backgroundImage:
            "repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 0,transparent 50%)",
          backgroundSize:  "8px 8px",
          pointerEvents:   "none",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* Wordmark */}
        <h1
          className="display"
          style={{
            fontSize:   "clamp(64px, 22vw, 100px)",
            lineHeight: 0.9,
            color:      C.text,
            marginBottom: 2,
          }}
        >
          RACERS
        </h1>
        <h1
          className="display"
          style={{
            fontSize:         "clamp(64px, 22vw, 100px)",
            lineHeight:       0.9,
            WebkitTextStroke: `2px ${C.accent}`,
            color:            "transparent",
            marginBottom:     20,
          }}
        >
          ARENA
        </h1>

        {/* Live demo speedometer */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Speedometer
            speed={demoSpeed}
            maxSpeed={SPEEDO_MAX_KMH}
            unit="kmh"
            style={{ maxWidth: 300 }}
          />
        </div>

        {/* Slogan */}
        <p
          style={{
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      12,
            letterSpacing: 6,
            color:         C.muted,
            marginBottom:  28,
          }}
        >
          NO BRAKES — NO MERCY
        </p>

        {/* Primary CTA */}
        <StartButton onClick={onStartRace} />
      </div>
    </div>
  );
}

// ─── START BUTTON ─────────────────────────────────────────────────────────────

function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      style={{
        padding:       "18px 48px",
        background:    C.accent,
        border:        "none",
        borderRadius:  14,
        color:         C.white,
        fontFamily:    FONT.display,
        fontSize:      22,
        letterSpacing: 8,
        cursor:        "pointer",
        animation:     "glow-pulse 2s ease-in-out infinite",
        marginBottom:  12,
      }}
    >
      ▶ START RUN
    </motion.button>
  );
}

// ─── QUICK STATS ──────────────────────────────────────────────────────────────

function QuickStats() {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap:                 10,
        marginBottom:        20,
      }}
    >
      {QUICK_STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
          style={{
            background:   C.card,
            border:       `1px solid ${C.border}`,
            borderRadius: 10,
            padding:      "14px 10px",
            textAlign:    "center",
          }}
        >
          <div
            className="display"
            style={{
              fontSize: 28,
              color:    i === 0 ? C.accent : C.text,
            }}
          >
            {s.val}
          </div>
          <div
            style={{
              fontFamily:    FONT.body,
              fontSize:      9,
              color:         C.muted,
              letterSpacing: 2,
              marginTop:     2,
            }}
          >
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── TOP RACERS PREVIEW ───────────────────────────────────────────────────────

interface TopRacersPreviewProps {
  racers:     typeof MOCK_RACERS;
  onViewAll:  () => void;
}

function TopRacersPreview({ racers, onViewAll }: TopRacersPreviewProps) {
  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   12,
        }}
      >
        <span
          className="display"
          style={{ fontSize: 18, letterSpacing: 3, color: C.text }}
        >
          TOP RACERS
        </span>
        <button
          onClick={onViewAll}
          style={{
            fontFamily:    FONT.body,
            fontSize:      11,
            color:         C.accent,
            fontWeight:    700,
            letterSpacing: 2,
            background:    "none",
            border:        "none",
            cursor:        "pointer",
          }}
        >
          WEEKLY →
        </button>
      </div>

      {/* Racer rows */}
      {racers.map((r, i) => (
        <RacerRow key={r.id} racer={r} rank={i + 1} delay={i * 0.06} />
      ))}
    </div>
  );
}

// ─── RACER ROW ────────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: C.gold,
  2: "#C0C0C0",
  3: "#CD7F32",
};

interface RacerRowProps {
  racer: typeof MOCK_RACERS[number];
  rank:  number;
  delay: number;
}

function RacerRow({ racer, rank, delay }: RacerRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0   }}
      transition={{ delay, duration: 0.28 }}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           12,
        padding:       "12px 0",
        borderBottom:  `1px solid ${C.border}`,
      }}
    >
      {/* Rank */}
      <span
        className="display"
        style={{
          fontSize: 20,
          color:    RANK_COLORS[rank] ?? C.muted,
          minWidth: 28,
        }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <div
        style={{
          width:          36,
          height:         36,
          borderRadius:   "50%",
          background:     `${C.accent}20`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontFamily:     FONT.display,
          fontSize:       14,
          color:          C.text,
          flexShrink:     0,
        }}
      >
        {racer.avatar}
      </div>

      {/* Name + car */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily:   FONT.body,
            fontWeight:   700,
            fontSize:     14,
            color:        C.text,
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {racer.name}
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted }}>
          {racer.car}
        </div>
      </div>

      {/* Top speed */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span
          className="display"
          style={{
            fontSize: 18,
            color:    rank === 1 ? C.gold : C.text,
          }}
        >
          {racer.topSpeed}
        </span>
        <span style={{ fontFamily: FONT.body, fontSize: 10, color: C.muted }}>
          {" "}km/h
        </span>
      </div>
    </motion.div>
  );
}