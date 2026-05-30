// screens/ExploreScreen.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT }                 from "@/lib/constants";
import { createClient }            from "@/lib/supabase/client";

interface RacerResult {
  id:             string;
  username:       string | null;
  avatar:         string | null;
  bio:            string | null;
  role:           string | null;
  profile_locked: boolean | null;
}

export function ExploreScreen() {
  const [query,   setQuery]   = useState("");
  const [racers,  setRacers]  = useState<RacerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRacers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const supabase = createClient() as any;

      let query_builder = supabase
        .from("users")
        .select("id, username, avatar, bio, role, profile_locked")
        .neq("username", "__supabase_connection_test__")
        .order("username", { ascending: true })
        .limit(50);

      if (q.trim().length > 0) {
        query_builder = query_builder.ilike("username", `%${q.trim()}%`);
      }

      const { data, error } = await query_builder;

      if (error) {
        console.error("[ExploreScreen] error:", error.message);
        return;
      }

      setRacers(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRacers("");
  }, [fetchRacers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRacers(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchRacers]);

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="display" style={{ fontSize: 32, letterSpacing: 4, color: C.text }}>EXPLORE</h2>
        <p style={{ fontFamily: FONT.body, color: C.muted, fontWeight: 600, fontSize: 13, letterSpacing: 1, marginTop: 4 }}>
          FIND RACERS WORLDWIDE
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.muted, pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search racers..."
          style={{ width: "100%", padding: "14px 44px", background: C.card, border: `1px solid ${query ? C.accent : C.border}`, borderRadius: 12, color: C.text, fontFamily: FONT.body, fontWeight: 600, fontSize: 15, outline: "none", caretColor: C.accent, transition: "border-color 0.2s" }}
        />
        {query.length > 0 && (
          <button onClick={() => setQuery("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: C.dim, border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted, fontSize: 12 }}>
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", height: 72, opacity: 1 - i * 0.2 }}>
              <div style={{ background: C.border, borderRadius: 6, height: 14, width: "40%", marginBottom: 8 }} />
              <div style={{ background: C.border, borderRadius: 6, height: 10, width: "60%" }} />
            </div>
          ))}
        </div>
      ) : racers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🌍</div>
          <div style={{ fontFamily: FONT.display, fontSize: 18, letterSpacing: 3, color: C.text, marginBottom: 8 }}>
            {query ? "NO RACERS FOUND" : "NO RACERS YET"}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted }}>
            {query ? `No results for "${query}"` : "Be the first to race!"}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
            {racers.length} RACER{racers.length !== 1 ? "S" : ""} FOUND
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {racers.map((racer, i) => (
              <RacerCard key={racer.id} racer={racer} delay={i * 0.04} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RacerCard({ racer, delay }: { racer: RacerResult; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const initials = (racer.username ?? "??").slice(0, 2).toUpperCase();

  if (racer.profile_locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.22 }}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}
      >
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.dim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🔒</div>
        <div>
          <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 15, color: C.muted }}>Locked Profile</div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.dim }}>Profile hidden by owner</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: C.card, border: `1px solid ${hovered ? C.accent : C.border}`, borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.18s" }}
    >
      {/* Avatar */}
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${C.accent}20`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 18, color: C.text, flexShrink: 0, overflow: "hidden" }}>
        {racer.avatar ? (
          <img src={racer.avatar} alt={racer.username ?? "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>
          {racer.username ?? "Anonymous"}
        </div>
        {racer.bio && (
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {racer.bio}
          </div>
        )}
      </div>
    </motion.div>
  );
}