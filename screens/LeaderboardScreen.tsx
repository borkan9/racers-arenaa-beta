// screens/LeaderboardScreen.tsx

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { MOCK_RACERS } from "@/lib/mockData";
import type { LeaderboardTab, RacerProfile, VerificationType } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeaderboardScreenProps {
  // No external props needed — data comes from mock store
}

// ─── RANK COLOURS ─────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: C.gold,
  2: "#C0C0C0",
  3: "#CD7F32",
};

const RANK_MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

// ─── SORT HELPERS ─────────────────────────────────────────────────────────────

function sortedBySpeed(racers: RacerProfile[]): RacerProfile[] {
  return [...racers].sort((a, b) => b.topSpeed - a.topSpeed);
}

function sortedByTime(racers: RacerProfile[]): RacerProfile[] {
  return [...racers].sort((a, b) => a.bestTime.localeCompare(b.bestTime));
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function LeaderboardScreen(_props: LeaderboardScreenProps) {
  const [tab, setTab] = useState<LeaderboardTab>("speed");

  const sorted =
    tab === "speed" ? sortedBySpeed(MOCK_RACERS) : sortedByTime(MOCK_RACERS);

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* ── Page header ── */}
      <PageHeader />

      {/* ── Tab switcher ── */}
      <TabSwitcher active={tab} onChange={setTab} />

      {/* ── Entries ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((racer, i) => (
              <LeaderboardRow
                key={racer.id}
                racer={racer}
                rank={i + 1}
                tab={tab}
                delay={i * 0.045}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Footer note ── */}
      <WeeklyNote />
    </div>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        className="display"
        style={{ fontSize: 32, letterSpacing: 4, color: C.text }}
      >
        LEADERBOARD
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
        WEEKLY RANKINGS — MAY 2026
      </p>
    </div>
  );
}

// ─── TAB SWITCHER ─────────────────────────────────────────────────────────────

interface TabSwitcherProps {
  active:   LeaderboardTab;
  onChange: (tab: LeaderboardTab) => void;
}

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "speed", label: "TOP SPEED" },
  { id: "time",  label: "BEST TIME" },
];

function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex:          1,
              padding:       "10px",
              background:    isActive ? C.accent : C.card,
              border:        `1px solid ${isActive ? C.accent : C.border}`,
              borderRadius:  8,
              color:         isActive ? C.white : C.muted,
              fontFamily:    FONT.display,
              fontSize:      16,
              letterSpacing: 3,
              cursor:        "pointer",
              transition:    "all 0.18s",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── LEADERBOARD ROW ──────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  racer: RacerProfile;
  rank:  number;
  tab:   LeaderboardTab;
  delay: number;
}

function LeaderboardRow({ racer, rank, tab, delay }: LeaderboardRowProps) {
  const isFirst       = rank === 1;
  const rankColor     = RANK_COLORS[rank] ?? C.dim;
  const rankDisplay   = rank <= 3 ? RANK_MEDALS[rank] : `#${rank}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0  }}
      transition={{ delay, duration: 0.25 }}
      style={{
        background:   C.card,
        border:       `1px solid ${isFirst ? C.gold : C.border}`,
        borderRadius: 12,
        padding:      "14px 16px",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
      }}
    >
      {/* Rank badge */}
      <div
        className="display"
        style={{
          fontSize: 26,
          minWidth: 38,
          color:    rankColor,
          letterSpacing: 1,
          textAlign: "center",
        }}
      >
        {rankDisplay}
      </div>

      {/* Avatar */}
      <Avatar initials={racer.avatar} isFirst={isFirst} />

      {/* Info block */}
      <InfoBlock racer={racer} />

      {/* Stat value */}
      <StatValue racer={racer} tab={tab} isFirst={isFirst} />
    </motion.div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  initials: string;
  isFirst:  boolean;
}

function Avatar({ initials, isFirst }: AvatarProps) {
  return (
    <div
      style={{
        width:          44,
        height:         44,
        borderRadius:   "50%",
        background:     `${C.accent}20`,
        border:         `2px solid ${isFirst ? C.gold : C.border}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     FONT.display,
        fontSize:       16,
        color:          C.text,
        flexShrink:     0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── INFO BLOCK ───────────────────────────────────────────────────────────────

interface InfoBlockProps {
  racer: RacerProfile;
}

function InfoBlock({ racer }: InfoBlockProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Name + country + badge row */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        6,
          flexWrap:   "wrap",
          marginBottom: 3,
        }}
      >
        <span
          style={{
            fontFamily:   FONT.body,
            fontWeight:   700,
            fontSize:     15,
            color:        C.text,
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            maxWidth:     120,
          }}
        >
          {racer.name}
        </span>
        <span style={{ fontSize: 14 }}>{racer.country}</span>
        <VerificationBadge type={racer.verified} />
      </div>

      {/* Car */}
      <div
        style={{
          fontFamily: FONT.body,
          fontSize:   12,
          color:      C.muted,
        }}
      >
        {racer.car}
      </div>

      {/* Race count */}
      <div
        style={{
          fontFamily:    FONT.body,
          fontSize:      10,
          color:         C.dim,
          marginTop:     2,
          letterSpacing: 1,
        }}
      >
        {racer.races} RACES
      </div>
    </div>
  );
}

// ─── STAT VALUE ───────────────────────────────────────────────────────────────

interface StatValueProps {
  racer:   RacerProfile;
  tab:     LeaderboardTab;
  isFirst: boolean;
}

function StatValue({ racer, tab, isFirst }: StatValueProps) {
  const value = tab === "speed"
    ? `${racer.topSpeed}`
    : racer.bestTime;

  const sub = tab === "speed" ? "KM/H" : "TIME";

  return (
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div
        className="display"
        style={{
          fontSize:      22,
          color:         isFirst ? C.gold : C.text,
          letterSpacing: 1,
        }}
      >
        {value}
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
        {sub}
      </div>
    </div>
  );
}

// ─── VERIFICATION BADGE ───────────────────────────────────────────────────────

interface VerificationBadgeProps {
  type: VerificationType;
}

function VerificationBadge({ type }: VerificationBadgeProps) {
  const cfg = BADGE_CONFIG[type];
  if (!cfg) return null;

  return (
    <span
      style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: 2,
        padding:       "2px 7px",
        borderRadius:  4,
        background:    `${cfg.color}18`,
        color:         cfg.color,
        border:        `1px solid ${cfg.color}40`,
        fontFamily:    FONT.body,
        whiteSpace:    "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── WEEKLY NOTE ──────────────────────────────────────────────────────────────

function WeeklyNote() {
  return (
    <div
      style={{
        marginTop:     24,
        padding:       "12px 16px",
        background:    C.surface,
        borderRadius:  10,
        border:        `1px solid ${C.border}`,
        display:       "flex",
        alignItems:    "center",
        gap:           10,
      }}
    >
      <span style={{ fontSize: 16 }}>🔄</span>
      <span
        style={{
          fontFamily:    FONT.body,
          fontSize:      12,
          color:         C.muted,
          letterSpacing: 1,
        }}
      >
        Leaderboard resets every Monday at 00:00 UTC
      </span>
    </div>
  );
}