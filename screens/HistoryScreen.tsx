// screens/HistoryScreen.tsx

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveMap } from "@/components/LiveMap";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { MOCK_HISTORY, MOCK_REPLAY_ROUTE } from "@/lib/mockData";
import type { RaceRecord } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface HistoryScreenProps {
  // Intentionally empty — data is sourced from mock store
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function HistoryScreen(_props: HistoryScreenProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* ── Page header ── */}
      <PageHeader count={MOCK_HISTORY.length} />

      {/* ── Race cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MOCK_HISTORY.map((race) => (
          <RaceCard
            key={race.id}
            race={race}
            expanded={expandedId === race.id}
            onToggle={() => toggle(race.id)}
          />
        ))}
      </div>

      {/* ── Empty state (future-proofing) ── */}
      {MOCK_HISTORY.length === 0 && <EmptyState />}
    </div>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────

function PageHeader({ count }: { count: number }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        className="display"
        style={{ fontSize: 32, letterSpacing: 4, color: C.text }}
      >
        MY RUNS
      </h2>
      <p
        style={{
          fontFamily:    FONT.body,
          color:         C.muted,
          fontWeight:    600,
          fontSize:      13,
          letterSpacing: 1,
          marginTop:     4,
        }}
      >
        {count} SESSION{count !== 1 ? "S" : ""} RECORDED
      </p>
    </div>
  );
}

// ─── RACE CARD ────────────────────────────────────────────────────────────────

interface RaceCardProps {
  race:     RaceRecord;
  expanded: boolean;
  onToggle: () => void;
}

function RaceCard({ race, expanded, onToggle }: RaceCardProps) {
  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${race.flagged ? C.yellow : C.border}`,
        borderRadius: 12,
        overflow:     "hidden",
        transition:   "border-color 0.2s",
      }}
    >
      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={onToggle}
        style={{
          width:      "100%",
          padding:    "16px",
          background: "none",
          border:     "none",
          cursor:     "pointer",
          textAlign:  "left",
        }}
      >
        <CardHeader race={race} expanded={expanded} />
      </button>

      {/* ── Expandable detail panel ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <CardDetail race={race} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CARD HEADER ─────────────────────────────────────────────────────────────

interface CardHeaderProps {
  race:     RaceRecord;
  expanded: boolean;
}

function CardHeader({ race, expanded }: CardHeaderProps) {
  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "flex-start",
        gap:            12,
      }}
    >
      {/* Left: mode + meta */}
      <div>
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            marginBottom: 4,
          }}
        >
          <span
            className="display"
            style={{ fontSize: 16, letterSpacing: 2, color: C.text }}
          >
            {race.mode}
          </span>
          {race.flagged && <FlaggedBadge />}
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize:   12,
            color:      C.muted,
          }}
        >
          {race.date} · {race.time} · {race.route}
        </div>
      </div>

      {/* Right: top speed + chevron */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          className="display"
          style={{ fontSize: 22, color: C.text, letterSpacing: 1 }}
        >
          {race.maxSpeed}{" "}
          <span
            style={{
              fontFamily: FONT.body,
              fontSize:   12,
              color:      C.muted,
            }}
          >
            km/h
          </span>
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
          TOP SPEED
        </div>
        {/* Expand chevron */}
        <div
          style={{
            marginTop:   6,
            color:       C.muted,
            fontSize:    12,
            transition:  "transform 0.2s",
            transform:   expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </div>
      </div>
    </div>
  );
}

// ─── CARD DETAIL ─────────────────────────────────────────────────────────────

interface CardDetailProps {
  race: RaceRecord;
}

function CardDetail({ race }: CardDetailProps) {
  const stats = [
    { label: "DURATION",  value: race.duration         },
    { label: "AVG SPEED", value: `${race.avgSpeed} km/h` },
    { label: "MAX SPEED", value: `${race.maxSpeed} km/h` },
  ] as const;

  return (
    <div
      style={{
        padding:    "0 16px 16px",
        borderTop:  `1px solid ${C.border}`,
        paddingTop: 16,
      }}
    >
      {/* Stat row */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap:                 10,
          marginBottom:        14,
        }}
      >
        {stats.map((s) => (
          <MiniStat key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Replay map */}
      <div
        style={{
          height:       100,
          borderRadius: 8,
          overflow:     "hidden",
          border:       `1px solid ${C.border}`,
        }}
      >
        <LiveMap
          active={false}
          routePoints={MOCK_REPLAY_ROUTE}
        />
      </div>

      {/* Flagged warning */}
      {race.flagged && <FlaggedWarning />}
    </div>
  );
}

// ─── MINI STAT ────────────────────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string;
}

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div
      style={{
        background:   C.surface,
        borderRadius: 8,
        padding:      "10px 12px",
        textAlign:    "center",
      }}
    >
      <div
        style={{
          fontFamily:    FONT.body,
          fontSize:      9,
          color:         C.muted,
          letterSpacing: 2,
          marginBottom:  4,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{ fontSize: 13, color: C.text, fontWeight: 700 }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── FLAGGED BADGE ────────────────────────────────────────────────────────────

function FlaggedBadge() {
  return (
    <span
      style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: 2,
        padding:       "2px 6px",
        borderRadius:  4,
        background:    `${C.yellow}20`,
        color:         C.yellow,
        border:        `1px solid ${C.yellow}40`,
        fontFamily:    FONT.body,
      }}
    >
      ⚠ FLAGGED
    </span>
  );
}

// ─── FLAGGED WARNING ──────────────────────────────────────────────────────────

function FlaggedWarning() {
  return (
    <div
      style={{
        marginTop:    12,
        padding:      "10px 14px",
        background:   `${C.yellow}10`,
        border:       `1px solid ${C.yellow}30`,
        borderRadius: 8,
        display:      "flex",
        alignItems:   "center",
        gap:          8,
      }}
    >
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span
        style={{
          fontFamily: FONT.body,
          fontSize:   12,
          color:      C.yellow,
          fontWeight: 600,
        }}
      >
        This run has been flagged for admin review. Results are
        provisional until reviewed.
      </span>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        textAlign:  "center",
        padding:    "60px 20px",
        color:      C.muted,
        fontFamily: FONT.body,
        fontWeight: 600,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>🏁</div>
      <div style={{ fontSize: 16, letterSpacing: 2 }}>NO RUNS YET</div>
      <div style={{ fontSize: 12, marginTop: 8, color: C.dim }}>
        Complete your first race to see it here.
      </div>
    </div>
  );
}