// screens/AdminPanel.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT }              from "@/lib/constants";
import { createClient }         from "@/lib/supabase/client";
import { fmtTime }              from "@/lib/utils";
import type { ScreenId }        from "@/types";

interface AdminPanelProps {
  onBack: (dest: ScreenId) => void;
}

type AdminTab = "flagged" | "racers" | "verify" | "board";

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "flagged", label: "⚠ FLAGGED"  },
  { id: "racers",  label: "RACERS"      },
  { id: "verify",  label: "VERIFY"      },
  { id: "board",   label: "LEADERBOARD" },
];

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("flagged");

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px", borderBottom: `1px solid ${C.border}` }}>
        <button
          onClick={() => onBack("home")}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", color: C.muted, cursor: "pointer", fontFamily: FONT.body, fontWeight: 600, fontSize: 13 }}
        >
          ← BACK
        </button>
        <h1 className="display" style={{ fontSize: 22, letterSpacing: 4, color: C.accent }}>ADMIN PANEL</h1>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted, fontFamily: FONT.mono, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          RESTRICTED
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 16px", background: activeTab === t.id ? C.accent : C.card, border: `1px solid ${activeTab === t.id ? C.accent : C.border}`, borderRadius: 8, whiteSpace: "nowrap", color: activeTab === t.id ? C.white : C.muted, fontFamily: FONT.display, fontSize: 14, letterSpacing: 2, cursor: "pointer", flexShrink: 0 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px 40px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "flagged" && <FlaggedTab />}
            {activeTab === "racers"  && <RacersTab  />}
            {activeTab === "verify"  && <VerifyTab  />}
            {activeTab === "board"   && <BoardTab   />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── FLAGGED TAB ──────────────────────────────────────────────────────────────

interface FlaggedRace {
  id:          string;
  created_at:  string;
  mode:        string;
  max_speed:   number;
  avg_speed:   number;
  distance_km: number;
  duration_ms: number | null;
  flag_reason: string | null;
  flagged:     boolean;
  status:      string;
  user_id:     string;
  users: {
    username: string | null;
    avatar:   string | null;
  } | null;
}

function FlaggedTab() {
  const [races,   setRaces]   = useState<FlaggedRace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/flagged");
      const result   = await response.json();

      if (!response.ok) {
        console.error("[Admin/Flagged]", result.error);
        return;
      }

      setRaces(result.races ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlagged(); }, [fetchFlagged]);

  const handleAction = async (raceId: string, action: "approve" | "remove") => {
    const response = await fetch("/api/admin/flagged", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ race_id: raceId, action }),
    });
    const result = await response.json();

    if (!response.ok) { alert("Failed: " + result.error); return; }
    setRaces((prev) => prev.filter((r) => r.id !== raceId));
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 20, letterSpacing: 3, color: "#EAB308" }}>FLAGGED RUNS</h3>
        <CountPill count={races.length} color="#EAB308" />
      </div>

      {races.length === 0 ? (
        <AllClearState label="No flagged runs — all clear" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {races.map((race) => (
            <FlaggedCard key={race.id} race={race} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlaggedCard({ race, onAction }: { race: FlaggedRace; onAction: (id: string, action: "approve" | "remove") => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(race.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ background: C.card, border: `1px solid #EAB30840`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="display" style={{ fontSize: 16, letterSpacing: 2, color: C.text }}>{race.mode.replace(/_/g, " ")}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, padding: "2px 7px", borderRadius: 4, background: "#EAB30820", color: "#EAB308", border: "1px solid #EAB30840", fontFamily: FONT.body }}>SUSPICIOUS</span>
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted }}>
              {race.users?.username ?? "Unknown"} · {date}
            </div>
            {race.flag_reason && (
              <div style={{ fontFamily: FONT.body, fontSize: 11, color: "#EAB308", marginTop: 2 }}>
                Reason: {race.flag_reason.replace(/_/g, " ")}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="display" style={{ fontSize: 20, color: C.accent }}>{Math.round(race.max_speed)}</div>
            <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2 }}>KM/H</div>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "MAX SPEED", value: `${Math.round(race.max_speed)} km/h`, hot: true },
                  { label: "AVG SPEED", value: `${Math.round(race.avg_speed)} km/h`,  hot: false },
                  { label: "DURATION",  value: race.duration_ms ? fmtTime(race.duration_ms) : "—", hot: false },
                  { label: "DISTANCE",  value: `${(race.distance_km * 1000).toFixed(0)} m`, hot: false },
                ].map((s) => (
                  <div key={s.label} style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 4 }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: s.hot ? C.accent : C.text }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ActionButton label="✓ APPROVE" color={C.green}  onClick={() => onAction(race.id, "approve")} />
                <ActionButton label="✕ REMOVE"  color={C.accent} onClick={() => onAction(race.id, "remove")}  />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── RACERS TAB ───────────────────────────────────────────────────────────────

interface RacerUser {
  id:       string;
  username: string | null;
  avatar:   string | null;
  role:     string | null;
  suspended?: boolean;
}

function RacersTab() {
  const [racers,  setRacers]  = useState<RacerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const fetchRacers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("users")
        .select("id, username, avatar, role")
        .order("username", { ascending: true });

      if (error) { console.error("[Admin/Racers]", error.message); return; }
      setRacers(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRacers(); }, [fetchRacers]);

  const handleSuspend = async (userId: string, suspend: boolean) => {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("users")
      .update({ role: suspend ? "suspended" : "user" })
      .eq("id", userId);

    if (error) { alert("Failed: " + error.message); return; }
    setRacers((prev) => prev.map((r) => r.id === userId ? { ...r, role: suspend ? "suspended" : "user" } : r));
  };

  const filtered = racers.filter((r) =>
    !search || (r.username ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <LoadingState />;

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 20, letterSpacing: 3, color: C.text }}>MANAGE RACERS</h3>
        <CountPill count={racers.length} color={C.muted} />
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username..."
        style={{ width: "100%", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: FONT.body, fontWeight: 600, fontSize: 13, outline: "none", caretColor: C.accent, marginBottom: 16 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((racer) => {
          const isSuspended = racer.role === "suspended";
          const initials    = (racer.username ?? "??").slice(0, 2).toUpperCase();

          return (
            <div key={racer.id} style={{ background: C.card, border: `1px solid ${isSuspended ? C.accent + "40" : C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 16, color: isSuspended ? C.muted : C.text, flexShrink: 0, overflow: "hidden", opacity: isSuspended ? 0.5 : 1 }}>
                {racer.avatar ? <img src={racer.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 14, color: isSuspended ? C.muted : C.text }}>{racer.username ?? "Anonymous"}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted }}>{racer.role ?? "user"}</div>
              </div>
              <button
                onClick={() => handleSuspend(racer.id, !isSuspended)}
                style={{ padding: "6px 12px", background: isSuspended ? `${C.green}15` : `${C.accent}10`, border: `1px solid ${isSuspended ? C.green + "40" : C.accent + "30"}`, borderRadius: 6, color: isSuspended ? C.green : C.accent, fontFamily: FONT.body, fontWeight: 700, fontSize: 10, letterSpacing: 1, cursor: "pointer", flexShrink: 0 }}
              >
                {isSuspended ? "RESTORE" : "SUSPEND"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VERIFY TAB ───────────────────────────────────────────────────────────────

function VerifyTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("users")
        .select("id, username, avatar, role")
        .eq("role", "pending_verification")
        .order("username", { ascending: true });

      if (error) { console.error("[Admin/Verify]", error.message); return; }
      setRequests(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleVerify = async (userId: string, approve: boolean) => {
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("users")
      .update({ role: approve ? "verified" : "user" })
      .eq("id", userId);

    if (error) { alert("Failed: " + error.message); return; }
    setRequests((prev) => prev.filter((r) => r.id !== userId));
  };

  if (loading) return <LoadingState />;

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 20, letterSpacing: 3, color: C.text }}>VERIFICATION QUEUE</h3>
        <CountPill count={requests.length} color={C.blue} />
      </div>

      {requests.length === 0 ? (
        <AllClearState label="No pending verification requests" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((r) => (
            <div key={r.id} style={{ background: C.card, border: `1px solid ${C.blue}40`, borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 18, color: C.text, overflow: "hidden" }}>
                  {r.avatar ? <img src={r.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (r.username ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 15, color: C.text }}>{r.username ?? "Anonymous"}</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.blue }}>Requesting verification</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ActionButton label="✓ APPROVE" color={C.green}  onClick={() => handleVerify(r.id, true)}  />
                <ActionButton label="✕ REJECT"  color={C.accent} onClick={() => handleVerify(r.id, false)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────

function BoardTab() {
  const [resetting,  setResetting]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done,       setDone]       = useState(false);
  const [count,      setCount]      = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const supabase = createClient() as any;
      const { count: c } = await supabase
        .from("leaderboard_entries")
        .select("id", { count: "exact", head: true });
      setCount(c ?? 0);
    };
    fetchCount();
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      const supabase = createClient() as any;
      const weekStart = getWeekStart();
      const { error } = await supabase
        .from("leaderboard_entries")
        .delete()
        .eq("week_start", weekStart);

      if (error) { alert("Failed: " + error.message); return; }
      setDone(true);
      setConfirming(false);
      setCount(0);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <h3 className="display" style={{ fontSize: 20, letterSpacing: 3, color: C.text, marginBottom: 16 }}>LEADERBOARD ADMIN</h3>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
        <div style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 14 }}>CURRENT WEEK</div>
        {[
          { label: "Week Start",      value: getWeekStart() },
          { label: "Reset Day",       value: "Monday 00:00 UTC" },
          { label: "Total Entries",   value: count !== null ? String(count) : "…" },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 13, color: C.text }}>{row.label}</span>
            <span className="mono" style={{ fontSize: 13, color: C.accent }}>{row.value}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div style={{ background: `${C.green}10`, border: `1px solid ${C.green}40`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: C.green, fontWeight: 700 }}>Leaderboard successfully reset.</span>
        </div>
      ) : confirming ? (
        <div style={{ background: C.card, border: `1px solid ${C.accent}40`, borderRadius: 12, padding: "16px" }}>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
            This will delete all entries for the current week. Racers must post new runs to appear on the board. This cannot be undone.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ActionButton label="CANCEL"         color={C.muted}  onClick={() => setConfirming(false)} />
            <ActionButton label={resetting ? "RESETTING…" : "CONFIRM RESET"} color={C.accent} onClick={handleReset} />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          style={{ width: "100%", padding: "14px", background: `${C.accent}15`, border: `1px solid ${C.accent}`, borderRadius: 10, color: C.accent, fontFamily: FONT.display, fontSize: 16, letterSpacing: 4, cursor: "pointer" }}
        >
          RESET WEEKLY LEADERBOARD
        </button>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function CountPill({ count, color }: { count: number; color: string }) {
  return (
    <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, fontFamily: FONT.body, letterSpacing: 1, border: `1px solid ${color}40` }}>
      {count}
    </span>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "10px", background: `${color}15`, border: `1px solid ${color}`, borderRadius: 8, color, fontFamily: FONT.body, fontWeight: 700, fontSize: 13, letterSpacing: 1, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

function AllClearState({ label }: { label: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
      <div style={{ fontFamily: FONT.body, fontWeight: 600, color: C.muted, fontSize: 13, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", height: 72, opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}

function getWeekStart(): string {
  const d    = new Date();
  const day  = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}