// screens/ExploreScreen.tsx

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { MOCK_RACERS } from "@/lib/mockData";
import type { RacerProfile, VerificationType } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ExploreScreenProps {
  // No external props — data sourced from mock store
}

// ─── FILTER HELPERS ───────────────────────────────────────────────────────────

function filterRacers(racers: RacerProfile[], query: string): RacerProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return racers;

  return racers.filter(
    (r) =>
      r.name.toLowerCase().includes(q)    ||
      r.tag.toLowerCase().includes(q)     ||
      r.car.toLowerCase().includes(q)     ||
      r.country.includes(q),
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ExploreScreen(_props: ExploreScreenProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterRacers(MOCK_RACERS, query),
    [query],
  );

  const handleClear = useCallback(() => setQuery(""), []);

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* ── Page header ── */}
      <PageHeader />

      {/* ── Search bar ── */}
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={handleClear}
      />

      {/* ── Results ── */}
      <ResultsSection racers={filtered} query={query} />

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
        EXPLORE
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
        FIND RACERS WORLDWIDE
      </p>
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────

interface SearchBarProps {
  value:    string;
  onChange: (v: string) => void;
  onClear:  () => void;
}

function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div
      style={{
        position:     "relative",
        marginBottom: 20,
      }}
    >
      {/* Search icon */}
      <span
        style={{
          position:  "absolute",
          left:      16,
          top:       "50%",
          transform: "translateY(-50%)",
          fontSize:  16,
          color:     C.muted,
          pointerEvents: "none",
        }}
      >
        🔍
      </span>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search racers, cars, countries…"
        style={{
          width:         "100%",
          padding:       "14px 44px",
          background:    C.card,
          border:        `1px solid ${value ? C.accent : C.border}`,
          borderRadius:  12,
          color:         C.text,
          fontFamily:    FONT.body,
          fontWeight:    600,
          fontSize:      15,
          outline:       "none",
          caretColor:    C.accent,
          transition:    "border-color 0.2s",
        }}
      />

      {/* Clear button */}
      {value.length > 0 && (
        <button
          onClick={onClear}
          style={{
            position:       "absolute",
            right:          12,
            top:            "50%",
            transform:      "translateY(-50%)",
            background:     C.dim,
            border:         "none",
            borderRadius:   "50%",
            width:          22,
            height:         22,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            color:          C.muted,
            fontSize:       12,
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── RESULTS SECTION ──────────────────────────────────────────────────────────

interface ResultsSectionProps {
  racers: RacerProfile[];
  query:  string;
}

function ResultsSection({ racers, query }: ResultsSectionProps) {
  return (
    <AnimatePresence mode="wait">
      {racers.length > 0 ? (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Result count */}
          <div
            style={{
              fontFamily:    FONT.body,
              fontSize:      11,
              color:         C.muted,
              letterSpacing: 2,
              marginBottom:  12,
            }}
          >
            {racers.length} RACER{racers.length !== 1 ? "S" : ""} FOUND
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {racers.map((racer, i) => (
              <RacerCard
                key={racer.id}
                racer={racer}
                delay={i * 0.04}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <EmptyResults key="empty" query={query} />
      )}
    </AnimatePresence>
  );
}

// ─── RACER CARD ───────────────────────────────────────────────────────────────

interface RacerCardProps {
  racer: RacerProfile;
  delay: number;
}

function RacerCard({ racer, delay }: RacerCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay, duration: 0.22 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   C.card,
        border:       `1px solid ${hovered ? C.accent : C.border}`,
        borderRadius: 12,
        padding:      "16px",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        cursor:       "pointer",
        transition:   "border-color 0.18s",
      }}
    >
      {/* Avatar */}
      <AvatarCircle
        initials={racer.avatar}
        locked={racer.locked}
      />

      {/* Info */}
      <RacerInfo racer={racer} />

      {/* Top speed */}
      <SpeedBadge
        speed={racer.topSpeed}
        locked={racer.locked}
      />
    </motion.div>
  );
}

// ─── AVATAR CIRCLE ────────────────────────────────────────────────────────────

interface AvatarCircleProps {
  initials: string;
  locked?:  boolean;
}

function AvatarCircle({ initials, locked }: AvatarCircleProps) {
  return (
    <div
      style={{
        width:          48,
        height:         48,
        borderRadius:   "50%",
        background:     `${C.accent}20`,
        border:         `2px solid ${locked ? C.dim : C.border}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     FONT.display,
        fontSize:       18,
        color:          locked ? C.muted : C.text,
        flexShrink:     0,
      }}
    >
      {locked ? "🔒" : initials}
    </div>
  );
}

// ─── RACER INFO ───────────────────────────────────────────────────────────────

interface RacerInfoProps {
  racer: RacerProfile;
}

function RacerInfo({ racer }: RacerInfoProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Name row */}
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
            maxWidth:     130,
          }}
        >
          {racer.locked ? "Locked Profile" : racer.name}
        </span>
        <span style={{ fontSize: 13 }}>{racer.country}</span>
        {!racer.locked && (
          <VerificationBadge type={racer.verified} />
        )}
        {racer.locked && <LockedBadge />}
      </div>

      {/* Tag + car */}
      {!racer.locked ? (
        <div
          style={{
            fontFamily: FONT.body,
            fontSize:   12,
            color:      C.muted,
          }}
        >
          {racer.tag} · {racer.car}
        </div>
      ) : (
        <div
          style={{
            fontFamily: FONT.body,
            fontSize:   12,
            color:      C.dim,
          }}
        >
          Profile hidden by owner
        </div>
      )}

      {/* Race count */}
      {!racer.locked && (
        <div
          style={{
            fontFamily:    FONT.body,
            fontSize:      10,
            color:         C.dim,
            letterSpacing: 1,
            marginTop:     2,
          }}
        >
          {racer.races} RACES
        </div>
      )}
    </div>
  );
}

// ─── SPEED BADGE ─────────────────────────────────────────────────────────────

interface SpeedBadgeProps {
  speed:   number;
  locked?: boolean;
}

function SpeedBadge({ speed, locked }: SpeedBadgeProps) {
  if (locked) {
    return (
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize:   12,
            color:      C.dim,
          }}
        >
          —
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div
        className="display"
        style={{ fontSize: 20, color: C.gold, letterSpacing: 1 }}
      >
        {speed}
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
        KM/H
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

// ─── LOCKED BADGE ────────────────────────────────────────────────────────────

function LockedBadge() {
  return (
    <span
      style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: 2,
        padding:       "2px 7px",
        borderRadius:  4,
        background:    `${C.dim}30`,
        color:         C.muted,
        border:        `1px solid ${C.dim}`,
        fontFamily:    FONT.body,
        whiteSpace:    "nowrap",
      }}
    >
      🔒 LOCKED
    </span>
  );
}

// ─── EMPTY RESULTS ────────────────────────────────────────────────────────────

interface EmptyResultsProps {
  query: string;
}

function EmptyResults({ query }: EmptyResultsProps) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        textAlign:  "center",
        padding:    "48px 20px",
        color:      C.muted,
        fontFamily: FONT.body,
        fontWeight: 600,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 16 }}>🌍</div>
      <div
        style={{
          fontSize:      16,
          letterSpacing: 2,
          marginBottom:  8,
          color:         C.text,
        }}
      >
        NO RACERS FOUND
      </div>
      {query.length > 0 && (
        <div style={{ fontSize: 13, color: C.muted }}>
          No results for{" "}
          <span style={{ color: C.accent }}>"{query}"</span>
          <br />
          Try a different name, car, or country.
        </div>
      )}
    </motion.div>
  );
}