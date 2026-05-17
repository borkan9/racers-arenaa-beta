// screens/AdminPanel.tsx

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveMap } from "@/components/LiveMap";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { MOCK_HISTORY, MOCK_RACERS, MOCK_REPLAY_ROUTE } from "@/lib/mockData";
import type { RaceRecord, RacerProfile, VerificationType, ScreenId } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface AdminPanelProps {
  onBack: (dest: ScreenId) => void;
}

type AdminTab = "flagged" | "racers" | "verify" | "board";

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "flagged", label: "⚠ FLAGGED"   },
  { id: "racers",  label: "RACERS"       },
  { id: "verify",  label: "VERIFY"       },
  { id: "board",   label: "LEADERBOARD"  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("flagged");

  const flaggedRaces = MOCK_HISTORY.filter((r) => r.flagged);

  return (
    <div
      style={{
        minHeight:  "100vh",
        background: C.bg,
      }}
    >
      {/* ── Top bar ── */}
      <AdminTopBar onBack={() => onBack("profile")} />

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ── */}
      <div style={{ padding: "0 20px 40px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "flagged"  && <FlaggedTab  races={flaggedRaces} />}
            {activeTab === "racers"   && <RacersTab   racers={MOCK_RACERS}  />}
            {activeTab === "verify"   && <VerifyTab                         />}
            {activeTab === "board"    && <BoardTab                          />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN TOP BAR
// ─────────────────────────────────────────────────────────────────────────────

interface AdminTopBarProps {
  onBack: () => void;
}

function AdminTopBar({ onBack }: AdminTopBarProps) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "20px",
        borderBottom:   `1px solid ${C.border}`,
      }}
    >
      <button
        onClick={onBack}
        style={{
          background:    "none",
          border:        `1px solid ${C.border}`,
          borderRadius:  8,
          padding:       "8px 16px",
          color:         C.muted,
          cursor:        "pointer",
          fontFamily:    FONT.body,
          fontWeight:    600,
          fontSize:      13,
          letterSpacing: 1,
        }}
      >
        ← BACK
      </button>

      <h1
        className="display"
        style={{
          fontSize:      22,
          letterSpacing: 4,
          color:         C.accent,
        }}
      >
        ADMIN PANEL
      </h1>

      {/* Restricted badge */}
      <span
        style={{
          marginLeft:    "auto",
          fontSize:      10,
          color:         C.muted,
          fontFamily:    FONT.mono,
          padding:       "4px 10px",
          border:        `1px solid ${C.border}`,
          borderRadius:  6,
          letterSpacing: 1,
        }}
      >
        v1.0 · RESTRICTED
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────────────────────────────────────

interface TabBarProps {
  active:   AdminTab;
  onChange: (tab: AdminTab) => void;
}

function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div
      style={{
        display:    "flex",
        gap:        8,
        padding:    "16px 20px",
        overflowX:  "auto",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {ADMIN_TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding:       "8px 16px",
              background:    isActive ? C.accent : C.card,
              border:        `1px solid ${isActive ? C.accent : C.border}`,
              borderRadius:  8,
              whiteSpace:    "nowrap",
              color:         isActive ? C.white : C.muted,
              fontFamily:    FONT.display,
              fontSize:      14,
              letterSpacing: 2,
              cursor:        "pointer",
              transition:    "all 0.15s",
              flexShrink:    0,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: FLAGGED RUNS
// ─────────────────────────────────────────────────────────────────────────────

interface FlaggedTabProps {
  races: RaceRecord[];
}

function FlaggedTab({ races }: FlaggedTabProps) {
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const handleAction = (id: number) => {
    setReviewed((prev) => new Set([...prev, id]));
  };

  const pending = races.filter((r) => !reviewed.has(r.id));

  return (
    <div style={{ paddingTop: 20 }}>
      {/* Header */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        8,
          marginBottom: 16,
        }}
      >
        <h3
          className="display"
          style={{
            fontSize:      20,
            letterSpacing: 3,
            color:         C.yellow,
          }}
        >
          FLAGGED RUNS
        </h3>
        <CountPill count={pending.length} color={C.yellow} />
      </div>

      {/* Cards */}
      {pending.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.map((race) => (
            <FlaggedRaceCard
              key={race.id}
              race={race}
              onApprove={() => handleAction(race.id)}
              onRemove={()  => handleAction(race.id)}
            />
          ))}
        </div>
      ) : (
        <AllClearState />
      )}
    </div>
  );
}

// ─── FLAGGED RACE CARD ────────────────────────────────────────────────────────

interface FlaggedRaceCardProps {
  race:      RaceRecord;
  onApprove: () => void;
  onRemove:  () => void;
}

function FlaggedRaceCard({ race, onApprove, onRemove }: FlaggedRaceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.yellow}40`,
        borderRadius: 12,
        overflow:     "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width:      "100%",
          padding:    "16px",
          background: "none",
          border:     "none",
          cursor:     "pointer",
          textAlign:  "left",
        }}
      >
        <div
          style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "flex-start",
            gap:            12,
          }}
        >
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
                style={{
                  fontSize:      16,
                  letterSpacing: 2,
                  color:         C.text,
                }}
              >
                {race.mode}
              </span>
              <SuspiciousBadge />
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

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              className="display"
              style={{
                fontSize:      20,
                color:         C.accent,
                letterSpacing: 1,
              }}
            >
              {race.maxSpeed}
            </div>
            <div
              style={{
                fontFamily:    FONT.body,
                fontSize:      9,
                color:         C.muted,
                letterSpacing: 2,
              }}
            >
              KM/H
            </div>
          </div>
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <FlaggedDetail
              race={race}
              onApprove={onApprove}
              onRemove={onRemove}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FLAGGED DETAIL ───────────────────────────────────────────────────────────

interface FlaggedDetailProps {
  race:      RaceRecord;
  onApprove: () => void;
  onRemove:  () => void;
}

function FlaggedDetail({ race, onApprove, onRemove }: FlaggedDetailProps) {
  return (
    <div
      style={{
        padding:    "0 16px 16px",
        borderTop:  `1px solid ${C.border}`,
        paddingTop: 16,
      }}
    >
      {/* Stats */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 10,
          marginBottom:        14,
        }}
      >
        <AdminStatBox
          label="MAX SPEED"
          value={`${race.maxSpeed} km/h`}
          hot
        />
        <AdminStatBox
          label="AVG SPEED"
          value={`${race.avgSpeed} km/h`}
        />
        <AdminStatBox
          label="DURATION"
          value={race.duration}
        />
        <AdminStatBox
          label="FLAG REASON"
          value="IMPOSSIBLE ACCEL"
          hot
        />
      </div>

      {/* Map preview */}
      <div
        style={{
          height:       100,
          borderRadius: 8,
          overflow:     "hidden",
          border:       `1px solid ${C.border}`,
          marginBottom: 14,
        }}
      >
        <LiveMap active={false} routePoints={MOCK_REPLAY_ROUTE} />
      </div>

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ActionButton
          label="✓ APPROVE"
          color={C.green}
          onClick={onApprove}
        />
        <ActionButton
          label="✕ REMOVE"
          color={C.accent}
          onClick={onRemove}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: RACERS
// ─────────────────────────────────────────────────────────────────────────────

interface RacersTabProps {
  racers: RacerProfile[];
}

function RacersTab({ racers }: RacersTabProps) {
  const [search, setSearch] = useState("");

  const filtered = racers.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.tag.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ paddingTop: 20 }}>
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   16,
        }}
      >
        <h3
          className="display"
          style={{
            fontSize:      20,
            letterSpacing: 3,
            color:         C.text,
          }}
        >
          MANAGE RACERS
        </h3>
        <CountPill count={racers.length} color={C.muted} />
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag…"
          style={{
            width:         "100%",
            padding:       "10px 14px",
            background:    C.surface,
            border:        `1px solid ${C.border}`,
            borderRadius:  8,
            color:         C.text,
            fontFamily:    FONT.body,
            fontWeight:    600,
            fontSize:      13,
            outline:       "none",
            caretColor:    C.accent,
          }}
        />
      </div>

      {/* Racer rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((racer) => (
          <AdminRacerRow key={racer.id} racer={racer} />
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN RACER ROW ─────────────────────────────────────────────────────────

interface AdminRacerRowProps {
  racer: RacerProfile;
}

function AdminRacerRow({ racer }: AdminRacerRowProps) {
  const [suspended, setSuspended] = useState(false);
  const cfg = BADGE_CONFIG[racer.verified];

  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${suspended ? C.accent + "40" : C.border}`,
        borderRadius: 12,
        padding:      "14px 16px",
        display:      "flex",
        alignItems:   "center",
        gap:          12,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width:          40,
          height:         40,
          borderRadius:   "50%",
          background:     `${C.accent}20`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontFamily:     FONT.display,
          fontSize:       16,
          color:          suspended ? C.muted : C.text,
          flexShrink:     0,
          opacity:        suspended ? 0.5 : 1,
        }}
      >
        {racer.avatar}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily:   FONT.body,
            fontWeight:   700,
            fontSize:     14,
            color:        suspended ? C.muted : C.text,
            marginBottom: 2,
          }}
        >
          {racer.name}
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize:   11,
            color:      C.muted,
          }}
        >
          {racer.tag} · {racer.races} races
        </div>
      </div>

      {/* Verified badge */}
      {cfg && (
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: 1,
            padding:       "2px 6px",
            borderRadius:  4,
            background:    `${cfg.color}15`,
            color:         cfg.color,
            border:        `1px solid ${cfg.color}30`,
            fontFamily:    FONT.body,
            flexShrink:    0,
          }}
        >
          {cfg.label}
        </span>
      )}

      {/* Suspend toggle */}
      <button
        onClick={() => setSuspended((v) => !v)}
        style={{
          padding:       "6px 12px",
          background:    suspended ? `${C.green}15` : `${C.accent}10`,
          border:        `1px solid ${suspended ? C.green + "40" : C.accent + "30"}`,
          borderRadius:  6,
          color:         suspended ? C.green : C.accent,
          fontFamily:    FONT.body,
          fontWeight:    700,
          fontSize:      10,
          letterSpacing: 1,
          cursor:        "pointer",
          flexShrink:    0,
          transition:    "all 0.15s",
        }}
      >
        {suspended ? "RESTORE" : "SUSPEND"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: VERIFICATION QUEUE
// ─────────────────────────────────────────────────────────────────────────────

function VerifyTab() {
  // Simulate a pending verification request
  const [dismissed, setDismissed] = useState(false);

  return (
    <div style={{ paddingTop: 20 }}>
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   16,
        }}
      >
        <h3
          className="display"
          style={{
            fontSize:      20,
            letterSpacing: 3,
            color:         C.text,
          }}
        >
          VERIFICATION QUEUE
        </h3>
        <CountPill count={dismissed ? 0 : 1} color={C.blue} />
      </div>

      {!dismissed ? (
        <VerificationRequest onDismiss={() => setDismissed(true)} />
      ) : (
        <AllClearState label="No pending verification requests" />
      )}
    </div>
  );
}

// ─── VERIFICATION REQUEST ────────────────────────────────────────────────────

interface VerificationRequestProps {
  onDismiss: () => void;
}

function VerificationRequest({ onDismiss }: VerificationRequestProps) {
  const racer = MOCK_RACERS[3]; // Amira Hassan — unverified

  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.blue}40`,
        borderRadius: 12,
        padding:      "16px",
      }}
    >
      {/* Applicant row */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width:          44,
            height:         44,
            borderRadius:   "50%",
            background:     `${C.blue}20`,
            border:         `2px solid ${C.blue}40`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontFamily:     FONT.display,
            fontSize:       18,
            color:          C.text,
            flexShrink:     0,
          }}
        >
          {racer.avatar}
        </div>
        <div>
          <div
            style={{
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize:   15,
              color:      C.text,
            }}
          >
            {racer.name}
          </div>
          <div
            style={{
              fontFamily: FONT.body,
              fontSize:   12,
              color:      C.muted,
            }}
          >
            {racer.tag} · Applying for{" "}
            <span style={{ color: C.blue, fontWeight: 700 }}>
              VERIFIED RACER
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          background:   C.surface,
          borderRadius: 8,
          padding:      "12px 14px",
          marginBottom: 14,
        }}
      >
        {[
          { label: "Car",    value: racer.car           },
          { label: "Races",  value: `${racer.races}`    },
          { label: "Top",    value: `${racer.topSpeed} km/h` },
          { label: "Country",value: racer.country       },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display:        "flex",
              justifyContent: "space-between",
              padding:        "4px 0",
            }}
          >
            <span
              style={{
                fontFamily:    FONT.body,
                fontSize:      12,
                color:         C.muted,
                letterSpacing: 1,
              }}
            >
              {row.label.toUpperCase()}
            </span>
            <span
              style={{
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize:   12,
                color:      C.text,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ActionButton
          label="✓ APPROVE"
          color={C.green}
          onClick={onDismiss}
        />
        <ActionButton
          label="✕ REJECT"
          color={C.accent}
          onClick={onDismiss}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: LEADERBOARD ADMIN
// ─────────────────────────────────────────────────────────────────────────────

function BoardTab() {
  const [resetDone, setResetDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ paddingTop: 20 }}>
      <h3
        className="display"
        style={{
          fontSize:      20,
          letterSpacing: 3,
          color:         C.text,
          marginBottom:  16,
        }}
      >
        LEADERBOARD ADMIN
      </h3>

      {/* Info card */}
      <div
        style={{
          background:   C.card,
          border:       `1px solid ${C.border}`,
          borderRadius: 12,
          padding:      "16px 20px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily:    FONT.body,
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: 3,
            color:         C.muted,
            marginBottom:  14,
          }}
        >
          CURRENT WEEK
        </div>

        {[
          { label: "Period",         value: "May 12 – May 18, 2026" },
          { label: "Weekly Reset",   value: "Sunday 00:00 UTC"       },
          { label: "Total Entries",  value: "47"                     },
          { label: "Flagged Entries",value: "1"                      },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              padding:        "6px 0",
              borderBottom:   `1px solid ${C.border}`,
            }}
          >
            <span
              style={{
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize:   13,
                color:      C.text,
              }}
            >
              {row.label}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 13,
                color:    C.accent,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Reset button */}
      {!resetDone ? (
        <>
          {confirming ? (
            <div
              style={{
                background:   C.card,
                border:       `1px solid ${C.accent}40`,
                borderRadius: 12,
                padding:      "16px",
              }}
            >
              <p
                style={{
                  fontFamily:   FONT.body,
                  fontSize:     13,
                  color:        C.muted,
                  marginBottom: 14,
                  lineHeight:   1.6,
                }}
              >
                This will clear all weekly leaderboard entries. Racers
                will need to post new runs to appear on the next board.
                This action cannot be undone.
              </p>
              <div
                style={{
                  display:             "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap:                 8,
                }}
              >
                <ActionButton
                  label="CANCEL"
                  color={C.muted}
                  onClick={() => setConfirming(false)}
                />
                <ActionButton
                  label="CONFIRM RESET"
                  color={C.accent}
                  onClick={() => { setResetDone(true); setConfirming(false); }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{
                width:         "100%",
                padding:       "14px",
                background:    `${C.accent}15`,
                border:        `1px solid ${C.accent}`,
                borderRadius:  10,
                color:         C.accent,
                fontFamily:    FONT.display,
                fontSize:      16,
                letterSpacing: 4,
                cursor:        "pointer",
                transition:    "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  `${C.accent}25`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  `${C.accent}15`;
              }}
            >
              RESET WEEKLY LEADERBOARD
            </button>
          )}
        </>
      ) : (
        <div
          style={{
            background:    `${C.green}10`,
            border:        `1px solid ${C.green}40`,
            borderRadius:  10,
            padding:       "14px 16px",
            display:       "flex",
            alignItems:    "center",
            gap:           10,
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <span
            style={{
              fontFamily: FONT.body,
              fontSize:   13,
              color:      C.green,
              fontWeight: 700,
            }}
          >
            Leaderboard successfully reset.
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface CountPillProps {
  count: number;
  color: string;
}

function CountPill({ count, color }: CountPillProps) {
  return (
    <span
      style={{
        background:    `${color}20`,
        color,
        fontSize:      10,
        fontWeight:    700,
        padding:       "2px 8px",
        borderRadius:  12,
        fontFamily:    FONT.body,
        letterSpacing: 1,
        border:        `1px solid ${color}40`,
      }}
    >
      {count}
    </span>
  );
}

interface AdminStatBoxProps {
  label: string;
  value: string;
  hot?:  boolean;
}

function AdminStatBox({ label, value, hot }: AdminStatBoxProps) {
  return (
    <div
      style={{
        background:   C.surface,
        borderRadius: 8,
        padding:      "10px 12px",
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
        style={{
          fontSize:   14,
          fontWeight: 700,
          color:      hot ? C.accent : C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label:   string;
  color:   string;
  onClick: () => void;
}

function ActionButton({ label, color, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       "10px",
        background:    `${color}15`,
        border:        `1px solid ${color}`,
        borderRadius:  8,
        color,
        fontFamily:    FONT.body,
        fontWeight:    700,
        fontSize:      13,
        letterSpacing: 1,
        cursor:        "pointer",
        transition:    "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          `${color}25`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          `${color}15`;
      }}
    >
      {label}
    </button>
  );
}

interface SuspiciousBadgeProps {
  // no props
}

function SuspiciousBadge(_props: SuspiciousBadgeProps = {}) {
  return (
    <span
      style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: 2,
        padding:       "2px 7px",
        borderRadius:  4,
        background:    `${C.yellow}20`,
        color:         C.yellow,
        border:        `1px solid ${C.yellow}40`,
        fontFamily:    FONT.body,
      }}
    >
      SUSPICIOUS
    </span>
  );
}

interface AllClearStateProps {
  label?: string;
}

function AllClearState({ label = "No flagged runs — all clear" }: AllClearStateProps) {
  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 12,
        padding:      "32px 24px",
        textAlign:    "center",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: 600,
          color:      C.muted,
          fontSize:   13,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </div>
  );
}