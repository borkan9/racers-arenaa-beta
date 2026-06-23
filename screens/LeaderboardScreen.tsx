// screens/LeaderboardScreen.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT }                 from "@/lib/constants";
import { createClient }            from "@/lib/supabase/client";
import { fmtTime }                 from "@/lib/utils";
import type { LeaderboardTab }     from "@/types";

interface LeaderboardEntry {
  rank:       number;
  value:      number;
  board_type: string;
  user: {
    id:       string;
    username: string | null;
    avatar:   string | null;
  };
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function getWeekStart(): string {
  const d    = new Date();
  const day  = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function LeaderboardScreen() {
  const [tab,     setTab]     = useState<LeaderboardTab>("speed");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (boardType: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase    = createClient() as any;
      const weekStart   = getWeekStart();
      const ascending   = boardType === "BEST_TIME";

      const { data, error: dbError } = await supabase
        .from("leaderboard_entries")
        .select(`
          value,
          board_type,
          users ( id, username, avatar )
        `)
        .eq("week_start", weekStart)
        .eq("board_type", boardType)
        .order("value", { ascending })
        .limit(50);

      if (dbError) {
        console.error("[Leaderboard] error:", dbError.message);
        setError(dbError.message);
        return;
      }

      const ranked = (data ?? []).map((e: any, i: number) => ({
        rank:       i + 1,
        value:      e.value,
        board_type: e.board_type,
        user: {
          id:       e.users?.id       ?? "",
          username: e.users?.username ?? "Anonymous",
          avatar:   e.users?.avatar   ?? null,
        },
      }));

      setEntries(ranked);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const boardType = tab === "speed" ? "TOP_SPEED" : "BEST_TIME";
    fetchLeaderboard(boardType);
  }, [tab, fetchLeaderboard]);

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="display" style={{ fontSize: 32, letterSpacing: 4, color: C.text }}>LEADERBOARD</h2>
        <p style={{ fontFamily: FONT.body, color: C.muted, fontWeight: 600, fontSize: 13, letterSpacing: 1, marginTop: 4 }}>
          WEEKLY RANKINGS — {new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["speed", "TOP SPEED"], ["time", "BEST TIME"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as LeaderboardTab)}
            style={{ flex: 1, padding: "10px", background: tab === id ? C.accent : C.card, border: `1px solid ${tab === id ? C.accent : C.border}`, borderRadius: 8, color: tab === id ? C.white : C.muted, fontFamily: FONT.display, fontSize: 16, letterSpacing: 3, cursor: "pointer", transition: "all 0.18s" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState icon="⚠️" title="FAILED TO LOAD" desc={error} />
      ) : entries.length === 0 ? (
        <EmptyState icon="🏆" title="NO ENTRIES YET" desc="Complete a race to appear on the leaderboard." />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((entry, i) => (
                <LeaderboardRow key={entry.user.id} entry={entry} tab={tab} delay={i * 0.045} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, padding: "12px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔄</span>
        <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted, letterSpacing: 1 }}>
          Leaderboard resets every Monday at 00:00 UTC
        </span>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, tab, delay }: { entry: LeaderboardEntry; tab: LeaderboardTab; delay: number }) {
  const isFirst     = entry.rank === 1;
  const rankDisplay = entry.rank <= 3 ? RANK_MEDALS[entry.rank] : `#${entry.rank}`;
  const initials    = (entry.user.username ?? "??").slice(0, 2).toUpperCase();
  const value       = tab === "speed"
    ? `${Math.round(entry.value)}`
    : fmtTime(entry.value);
  const valueSub    = tab === "speed" ? "KM/H" : "TIME";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{ background: C.card, border: `1px solid ${isFirst ? C.gold : C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}
    >
      {/* Rank */}
      <div className="display" style={{ fontSize: 26, minWidth: 38, color: entry.rank === 1 ? C.gold : entry.rank === 2 ? "#C0C0C0" : entry.rank === 3 ? "#CD7F32" : C.dim, letterSpacing: 1, textAlign: "center" }}>
        {rankDisplay}
      </div>

      {/* Avatar */}
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.accent}20`, border: `2px solid ${isFirst ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 16, color: C.text, flexShrink: 0, overflow: "hidden" }}>
        {entry.user.avatar ? (
          <img src={entry.user.avatar} alt={entry.user.username ?? "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 15, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.user.username ?? "Anonymous"}
        </div>
      </div>

      {/* Value */}
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
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", height: 72, opacity: 1 - i * 0.15 }}>
          <div style={{ background: C.border, borderRadius: 6, height: 14, width: "40%", marginBottom: 8 }} />
          <div style={{ background: C.border, borderRadius: 6, height: 10, width: "25%" }} />
        </div>
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