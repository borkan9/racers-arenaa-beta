// screens/LeaderboardScreen.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT } from "@/lib/constants";
import { fmtTime } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  value: number;
  board_type: string;
  mode: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
  };
}

type LeaderboardMode = "TOP_SPEED" | "FREE_RUN" | "ZERO_TO_100" | "ZERO_TO_200" | "QUARTER_MILE";

const MODE_OPTIONS: { id: LeaderboardMode; label: string; boardType: "TOP_SPEED" | "BEST_TIME" }[] = [
  { id: "TOP_SPEED", label: "TOP SPEED", boardType: "TOP_SPEED" },
  { id: "FREE_RUN", label: "FREE RUN", boardType: "TOP_SPEED" },
  { id: "ZERO_TO_100", label: "0 → 100", boardType: "BEST_TIME" },
  { id: "ZERO_TO_200", label: "0 → 200", boardType: "BEST_TIME" },
  { id: "QUARTER_MILE", label: "¼ MILE", boardType: "BEST_TIME" },
];

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardScreen() {
  const [mode, setMode] = useState<LeaderboardMode>("TOP_SPEED");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selected = MODE_OPTIONS.find((option) => option.id === mode)!;

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        mode,
        type: selected.boardType,
        limit: "50",
      });
      const res = await fetch(`/api/leaderboard?${params.toString()}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body?.error ?? "Failed to load leaderboard.");
        setEntries([]);
        return;
      }

      setEntries((body.entries ?? []) as LeaderboardEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [mode, selected.boardType]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="ranks-page" style={{ padding: "10px 0" }}>
      <div className="ranks-heading">
        <span className="ra-kicker">THE GRID · THIS WEEK</span>
        <h1 className="ra-title">Ranks<span>.</span></h1>
        <p>Top runs from drivers on the board. Every challenge has its own podium.</p>
      </div>

      <div className="ranks-mode-list">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setMode(option.id)}
            className={mode === option.id ? "ranks-mode is-selected" : "ranks-mode"}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="ranks-results-heading"><span>{selected.label}</span><span>{entries.length ? `${entries.length} DRIVERS` : "WEEKLY BOARD"}</span></div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState icon="!" title="RANKS UNAVAILABLE" desc={error} />
      ) : entries.length === 0 ? (
        <EmptyState icon="01" title="NO TIMES ON THE BOARD" desc={`Set the first mark with a ${selected.label} run.`} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {entries.map((entry, i) => (
                <LeaderboardRow
                  key={`${entry.mode}:${entry.user.id}`}
                  entry={entry}
                  timed={selected.boardType === "BEST_TIME"}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="ranks-footnote">
        <span>↻</span><span>Leaderboard points refresh every Monday at 00:00 UTC.</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, timed, delay }: { entry: LeaderboardEntry; timed: boolean; delay: number }) {
  const isFirst = entry.rank === 1;
  const rankDisplay = entry.rank <= 3 ? RANK_MEDALS[entry.rank] : `#${entry.rank}`;
  const initials = (entry.user.username ?? "??").slice(0, 2).toUpperCase();
  const value = timed ? fmtTime(entry.value) : `${Math.round(entry.value)}`;
  const valueSub = timed ? "TIME" : "KM/H";

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{ background: C.card, border: `1px solid ${isFirst ? C.gold : C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}
    >
      <div className="display" style={{ fontSize: 26, minWidth: 38, color: entry.rank === 1 ? C.gold : entry.rank === 2 ? "#C0C0C0" : entry.rank === 3 ? "#CD7F32" : C.dim, textAlign: "center" }}>
        {rankDisplay}
      </div>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.accent}20`, border: `2px solid ${isFirst ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 16, color: C.text, flexShrink: 0, overflow: "hidden" }}>
        {entry.user.avatar ? <img src={entry.user.avatar} alt={entry.user.username ?? "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 15, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.user.username ?? "Anonymous"}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="display" style={{ fontSize: 22, color: isFirst ? C.gold : C.text, letterSpacing: 1 }}>{value}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2, marginTop: 2 }}>{valueSub}</div>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", height: 72, opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: FONT.display, fontSize: 18, letterSpacing: 3, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted }}>{desc}</div>
    </div>
  );
}
