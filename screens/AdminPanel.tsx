// screens/AdminPanel.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { C, FONT } from "@/lib/constants";
import { fmtTime } from "@/lib/utils";
import type { ScreenId } from "@/types";

interface AdminPanelProps {
  onBack: (dest: ScreenId) => void;
}

type AdminTab = "flagged" | "racers" | "verify" | "board";

type RacerUser = {
  id: string;
  username: string | null;
  avatar: string | null;
  role: string | null;
};

type FlaggedRace = {
  id: string;
  created_at: string;
  mode: string;
  max_speed: number;
  avg_speed: number;
  distance_km: number;
  duration_ms: number | null;
  flag_reason: string | null;
  user_id: string;
};

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "flagged", label: "⚠ FLAGGED" },
  { id: "racers", label: "RACERS" },
  { id: "verify", label: "VERIFY" },
  { id: "board", label: "LEADERBOARD" },
];

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? `Request failed (${response.status}).`);
  return body;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("flagged");

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 20, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => onBack("home")} style={secondaryButtonStyle}>← BACK</button>
        <h1 className="display" style={{ fontSize: 22, letterSpacing: 4, color: C.accent }}>ADMIN PANEL</h1>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted, fontFamily: FONT.mono, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }}>RESTRICTED</span>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              background: activeTab === tab.id ? C.accent : C.card,
              border: `1px solid ${activeTab === tab.id ? C.accent : C.border}`,
              borderRadius: 8,
              whiteSpace: "nowrap",
              color: activeTab === tab.id ? C.white : C.muted,
              fontFamily: FONT.display,
              fontSize: 14,
              letterSpacing: 2,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 20px 40px" }}>
        {activeTab === "flagged" && <FlaggedTab />}
        {activeTab === "racers" && <RacersTab />}
        {activeTab === "verify" && <VerifyTab />}
        {activeTab === "board" && <BoardTab />}
      </div>
    </div>
  );
}

function FlaggedTab() {
  const [races, setRaces] = useState<FlaggedRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await readJson(await fetch("/api/admin/flagged", { credentials: "include" }));
      setRaces(body.races ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flagged runs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (raceId: string, action: "approve" | "remove") => {
    try {
      await readJson(await fetch("/api/admin/flagged", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ race_id: raceId, action }),
      }));
      setRaces((prev) => prev.filter((race) => race.id !== raceId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Admin action failed.");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <section>
      <SectionTitle title="FLAGGED RUNS" count={races.length} />
      {races.length === 0 ? <EmptyState text="No flagged runs — all clear" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {races.map((race) => (
            <div key={race.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div>
                  <div className="display" style={{ fontSize: 18, color: C.text, letterSpacing: 2 }}>{race.mode.replaceAll("_", " ")}</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted, marginTop: 3 }}>{new Date(race.created_at).toLocaleString()}</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.yellow, marginTop: 3 }}>{race.flag_reason?.replaceAll("_", " ") ?? "Review required"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="display" style={{ color: C.accent, fontSize: 24 }}>{Math.round(race.max_speed)}</div>
                  <div style={{ color: C.muted, fontSize: 9, letterSpacing: 2 }}>KM/H</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <MiniStat label="AVG" value={`${Math.round(race.avg_speed)} km/h`} />
                <MiniStat label="TIME" value={race.duration_ms ? fmtTime(race.duration_ms) : "—"} />
                <MiniStat label="DIST" value={`${(race.distance_km * 1000).toFixed(0)} m`} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ActionButton label="✓ APPROVE" color={C.green} onClick={() => void act(race.id, "approve")} />
                <ActionButton label="✕ REMOVE" color={C.accent} onClick={() => void act(race.id, "remove")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RacersTab() {
  const [racers, setRacers] = useState<RacerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await readJson(await fetch("/api/admin/users?limit=200", { credentials: "include" }));
      setRacers(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load racers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? racers.filter((racer) => (racer.username ?? "").toLowerCase().includes(q)) : racers;
  }, [racers, search]);

  const toggleSuspension = async (racer: RacerUser) => {
    const suspended = racer.role === "suspended";
    try {
      const body = await readJson(await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: racer.id, action: suspended ? "restore" : "suspend" }),
      }));
      setRacers((prev) => prev.map((item) => item.id === racer.id ? body.user : item));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update racer.");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <section>
      <SectionTitle title="MANAGE RACERS" count={racers.length} />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by username..."
        maxLength={50}
        style={{ width: "100%", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, marginBottom: 16 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((racer) => {
          const suspended = racer.role === "suspended";
          return (
            <div key={racer.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar user={racer} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.body, fontWeight: 700, color: suspended ? C.muted : C.text }}>{racer.username ?? "Anonymous"}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted }}>{racer.role ?? "user"}</div>
              </div>
              <button onClick={() => void toggleSuspension(racer)} style={{ ...secondaryButtonStyle, color: suspended ? C.green : C.accent, borderColor: suspended ? C.green : C.accent }}>
                {suspended ? "RESTORE" : "SUSPEND"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VerifyTab() {
  const [requests, setRequests] = useState<RacerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await readJson(await fetch("/api/admin/users?role=pending_verification&limit=200", { credentials: "include" }));
      setRequests(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load verification queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const verify = async (userId: string, approve: boolean) => {
    try {
      await readJson(await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: approve ? "verify" : "reject_verification" }),
      }));
      setRequests((prev) => prev.filter((item) => item.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verification action failed.");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <section>
      <SectionTitle title="VERIFICATION QUEUE" count={requests.length} />
      {requests.length === 0 ? <EmptyState text="No pending verification requests" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((racer) => (
            <div key={racer.id} style={cardStyle}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Avatar user={racer} />
                <div>
                  <div style={{ fontFamily: FONT.body, fontWeight: 700, color: C.text }}>{racer.username ?? "Anonymous"}</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.blue }}>Requesting verification</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ActionButton label="✓ APPROVE" color={C.green} onClick={() => void verify(racer.id, true)} />
                <ActionButton label="✕ REJECT" color={C.accent} onClick={() => void verify(racer.id, false)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BoardTab() {
  const [count, setCount] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await readJson(await fetch("/api/admin/leaderboard", { credentials: "include" }));
      setCount(body.total_entries ?? 0);
      setWeekStart(body.week_start ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard admin stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reset = async () => {
    setResetting(true);
    try {
      await readJson(await fetch("/api/admin/leaderboard", { method: "POST", credentials: "include" }));
      setCount(0);
      setConfirming(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset leaderboard.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <section>
      <SectionTitle title="LEADERBOARD ADMIN" />
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <InfoRow label="Week Start" value={weekStart || "—"} />
        <InfoRow label="Reset Day" value="Monday 00:00 UTC" />
        <InfoRow label="Total Entries" value={count === null ? "—" : String(count)} />
      </div>

      {confirming ? (
        <div style={{ ...cardStyle, borderColor: C.accent }}>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            This deletes all entries for the current week. This cannot be undone.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ActionButton label="CANCEL" color={C.muted} onClick={() => setConfirming(false)} />
            <ActionButton label={resetting ? "RESETTING…" : "CONFIRM RESET"} color={C.accent} onClick={() => void reset()} />
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} style={{ width: "100%", padding: 14, background: `${C.accent}15`, border: `1px solid ${C.accent}`, borderRadius: 10, color: C.accent, fontFamily: FONT.display, fontSize: 16, letterSpacing: 4, cursor: "pointer" }}>
          RESET WEEKLY LEADERBOARD
        </button>
      )}
    </section>
  );
}

function Avatar({ user }: { user: RacerUser }) {
  const initials = (user.username ?? "??").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, color: C.text, fontFamily: FONT.display, fontSize: 16 }}>
      {user.avatar ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <h3 className="display" style={{ fontSize: 20, letterSpacing: 3, color: C.text }}>{title}</h3>
      {typeof count === "number" && <span style={{ color: C.muted, fontFamily: FONT.mono, fontSize: 11 }}>{count}</span>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.surface, borderRadius: 8, padding: "9px 10px" }}>
      <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.text, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: FONT.body, color: C.text, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: FONT.mono, color: C.accent, fontSize: 12 }}>{value}</span>
    </div>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: 10, background: `${color}15`, border: `1px solid ${color}`, borderRadius: 8, color, fontFamily: FONT.body, fontWeight: 700, cursor: "pointer" }}>{label}</button>;
}

function LoadingState() {
  return <div style={{ padding: 30, textAlign: "center", color: C.muted, fontFamily: FONT.body }}>LOADING…</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ ...cardStyle, textAlign: "center", color: C.muted, fontFamily: FONT.body }}>✅ {text}</div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return (
    <div style={{ ...cardStyle, borderColor: C.accent }}>
      <div style={{ color: C.accent, fontFamily: FONT.body, marginBottom: 12 }}>{message}</div>
      <button onClick={() => void retry()} style={secondaryButtonStyle}>RETRY</button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 16,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  color: C.muted,
  cursor: "pointer",
  fontFamily: FONT.body,
  fontWeight: 700,
  fontSize: 11,
};
