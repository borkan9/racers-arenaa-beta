// screens/HistoryScreen.tsx

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveMap }           from "@/components/LiveMap";
import { C, FONT }           from "@/lib/constants";
import { useRaceHistory }    from "@/hooks/useRace";
import { useSession }        from "@/hooks/useSession";
import { fmtTime }           from "@/lib/utils";
import type { RaceRow }      from "@/types/database.types";

export function HistoryScreen() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const { races, isLoading, error, hasMore, loadMore, count } = useRaceHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Not signed in ──
  if (!sessionLoading && !isAuthenticated) {
    return (
      <div style={{ padding: "24px 20px" }}>
        <PageHeader count={0} />
        <EmptyState
          icon="🔒"
          title="SIGN IN REQUIRED"
          desc="Sign in to see your race history."
        />
      </div>
    );
  }

  // ── Loading ──
  if (isLoading && races.length === 0) {
    return (
      <div style={{ padding: "24px 20px" }}>
        <PageHeader count={0} />
        <LoadingState />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{ padding: "24px 20px" }}>
        <PageHeader count={0} />
        <EmptyState icon="⚠️" title="FAILED TO LOAD" desc={error} />
      </div>
    );
  }

  // ── No races yet ──
  if (!isLoading && races.length === 0) {
    return (
      <div style={{ padding: "24px 20px" }}>
        <PageHeader count={0} />
        <EmptyState
          icon="🏁"
          title="NO RUNS YET"
          desc="Complete your first race to see it here."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px" }}>
      <PageHeader count={count} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {races.map((race) => (
          <RaceCard
            key={race.id}
            race={race}
            expanded={expandedId === race.id}
            onToggle={() => setExpandedId(expandedId === race.id ? null : race.id)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          style={{
            width:         "100%",
            marginTop:     16,
            padding:       "14px",
            background:    "transparent",
            border:        `1px solid ${C.border}`,
            borderRadius:  10,
            color:         C.muted,
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      13,
            letterSpacing: 2,
            cursor:        isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "LOADING…" : "LOAD MORE"}
        </button>
      )}
    </div>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────

function PageHeader({ count }: { count: number | null }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="display" style={{ fontSize: 32, letterSpacing: 4, color: C.text }}>MY RUNS</h2>
      <p style={{ fontFamily: FONT.body, color: C.muted, fontWeight: 600, fontSize: 13, letterSpacing: 1, marginTop: 4 }}>
        {count ? `${count} SESSION${count !== 1 ? "S" : ""} RECORDED` : "LOADING…"}
      </p>
    </div>
  );
}

// ─── RACE CARD ────────────────────────────────────────────────────────────────

interface RaceCardProps {
  race:     RaceRow;
  expanded: boolean;
  onToggle: () => void;
}

function RaceCard({ race, expanded, onToggle }: RaceCardProps) {
  const date     = new Date(race.created_at);
  const dateStr  = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr  = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const duration = race.duration_ms ? fmtTime(race.duration_ms) : "—";
  const maxSpeed = race.max_speed?.toFixed(1) ?? "0";
  const avgSpeed = race.avg_speed?.toFixed(1)  ?? "0";
  const modeName = race.mode.replace(/_/g, " ");

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${race.flagged ? "#EAB308" : C.border}`,
      borderRadius: 12,
      overflow:     "hidden",
      transition:   "border-color 0.2s",
    }}>
      {/* Header */}
      <button onClick={onToggle} style={{ width: "100%", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="display" style={{ fontSize: 16, letterSpacing: 2, color: C.text }}>{modeName}</span>
              {race.flagged && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, padding: "2px 6px", borderRadius: 4, background: "#EAB30820", color: "#EAB308", border: "1px solid #EAB30840", fontFamily: FONT.body }}>
                  ⚠ FLAGGED
                </span>
              )}
              {race.is_private && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, padding: "2px 6px", borderRadius: 4, background: `${C.dim}30`, color: C.muted, border: `1px solid ${C.dim}`, fontFamily: FONT.body }}>
                  🔒 PRIVATE
                </span>
              )}
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted }}>
              {dateStr} · {timeStr}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="display" style={{ fontSize: 22, color: C.text, letterSpacing: 1 }}>
              {maxSpeed} <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted }}>km/h</span>
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2, marginTop: 2 }}>TOP SPEED</div>
            <div style={{ marginTop: 6, color: C.muted, fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
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
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "DURATION",  value: duration       },
                  { label: "AVG SPEED", value: `${avgSpeed} km/h` },
                  { label: "DISTANCE",  value: `${(race.distance_km * 1000).toFixed(0)} m` },
                ].map((s) => (
                  <div key={s.label} style={{ background: C.surface, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 4 }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Map */}
              {race.route_points && (race.route_points as any[]).length > 1 ? (
                <div style={{ height: 120, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <LiveMap
                    active={false}
                    routePoints={(race.route_points as any[]).map((p: any) => ({
                      lat: p.lat, lng: p.lng, speed: p.speed, ts: p.ts,
                      x: 0, y: 0,
                    }))}
                  />
                </div>
              ) : (
                <div style={{ height: 80, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.dim }}>No GPS data recorded</span>
                </div>
              )}

              {/* Flagged warning */}
              {race.flagged && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#EAB30810", border: "1px solid #EAB30830", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: "#EAB308", fontWeight: 600 }}>
                    This run has been flagged for admin review. Results are provisional.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── STATES ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", height: 80, opacity: 1 - i * 0.2 }}>
          <div style={{ background: C.border, borderRadius: 6, height: 14, width: "40%", marginBottom: 8 }} />
          <div style={{ background: C.border, borderRadius: 6, height: 10, width: "60%" }} />
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