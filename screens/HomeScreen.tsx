// screens/HomeScreen.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion }          from "framer-motion";
import { Speedometer }     from "@/components/Speedometer";
import { createClient }    from "@/lib/supabase/client";
import { C, FONT, DEMO_SPEED_INTERVAL_MS, SPEEDO_MAX_KMH } from "@/lib/constants";
import type { ScreenId }   from "@/types";

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface TopRacer {
  id:       string;
  username: string | null;
  avatar:   string | null;
  value:    number;
}

interface QuickStat {
  val:   string;
  label: string;
}

function useDemoSpeed(): number {
  const [speed, setSpeed] = useState(0);
  const dirRef            = React.useRef<1 | -1>(1);

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed((prev) => {
        const next = prev + dirRef.current * (2 + Math.random() * 4);
        if (next >= 260) { dirRef.current = -1; return 260; }
        if (next <= 0)   { dirRef.current =  1; return 0;   }
        return next;
      });
    }, DEMO_SPEED_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return speed;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const demoSpeed               = useDemoSpeed();
  const [topRacers, setTopRacers] = useState<TopRacer[]>([]);
  const [stats,     setStats]     = useState<QuickStat[]>([
    { val: "0", label: "RACERS"   },
    { val: "0", label: "TOP KM/H" },
    { val: "0", label: "RUNS"     },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient() as any;

      // Fetch top racers from leaderboard
      const weekStart = getWeekStart();
      const { data: lbData } = await supabase
        .from("leaderboard_entries")
        .select("value, users ( id, username, avatar )")
        .eq("week_start", weekStart)
        .eq("board_type", "TOP_SPEED")
        .order("value", { ascending: false })
        .limit(3);

      if (lbData && lbData.length > 0) {
        setTopRacers(lbData.map((e: any) => ({
          id:       e.users?.id       ?? "",
          username: e.users?.username ?? "Anonymous",
          avatar:   e.users?.avatar   ?? null,
          value:    e.value,
        })));
      }

      // Fetch quick stats
      const [usersRes, racesRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("races").select("id, max_speed", { count: "exact" }).eq("status", "FINISHED"),
      ]);

      const totalRacers = usersRes.count ?? 0;
      const totalRaces  = racesRes.count ?? 0;
      const allSpeeds   = (racesRes.data ?? []) as { max_speed: number }[];
      const topSpeed    = allSpeeds.length > 0
        ? Math.round(Math.max(...allSpeeds.map((r) => r.max_speed)))
        : 0;

      setStats([
        { val: String(totalRacers), label: "RACERS"   },
        { val: String(topSpeed),    label: "TOP KM/H" },
        { val: String(totalRaces),  label: "RUNS"     },
      ]);
    } catch (err) {
      console.error("[HomeScreen] fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ minHeight: "100%", background: C.bg }}>

      {/* Hero */}
      <div style={{ padding: "40px 20px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <h1 className="display" style={{ fontSize: "clamp(64px,22vw,100px)", lineHeight: 0.9, color: C.text, marginBottom: 2 }}>RACERS</h1>
          <h1 className="display" style={{ fontSize: "clamp(64px,22vw,100px)", lineHeight: 0.9, WebkitTextStroke: `2px ${C.accent}`, color: "transparent", marginBottom: 20 }}>ARENA</h1>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Speedometer speed={demoSpeed} maxSpeed={SPEEDO_MAX_KMH} unit="kmh" style={{ maxWidth: 300 }} />
          </div>

          <p style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 12, letterSpacing: 6, color: C.muted, marginBottom: 28 }}>
            NO BRAKES — NO MERCY
          </p>

          <motion.button
            onClick={() => onNavigate("raceScreen")}
            whileTap={{ scale: 0.97 }}
            style={{ padding: "18px 48px", background: C.accent, border: "none", borderRadius: 14, color: C.white, fontFamily: FONT.display, fontSize: 22, letterSpacing: 8, cursor: "pointer", animation: "glow-pulse 2s ease-in-out infinite", marginBottom: 12 }}
          >
            ▶ START RUN
          </motion.button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}
            >
              <div className="display" style={{ fontSize: 28, color: i === 0 ? C.accent : C.text }}>{s.val}</div>
              <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2, marginTop: 2 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Top racers */}
        {topRacers.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="display" style={{ fontSize: 18, letterSpacing: 3, color: C.text }}>TOP RACERS</span>
              <button
                onClick={() => onNavigate("board")}
                style={{ fontFamily: FONT.body, fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 2, background: "none", border: "none", cursor: "pointer" }}
              >
                WEEKLY →
              </button>
            </div>

            {topRacers.map((r, i) => (
              <TopRacerRow key={r.id} racer={r} rank={i + 1} delay={i * 0.06} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopRacerRow({ racer, rank, delay }: { racer: TopRacer; rank: number; delay: number }) {
  const RANK_COLORS: Record<number, string> = { 1: C.gold, 2: "#C0C0C0", 3: "#CD7F32" };
  const initials = (racer.username ?? "??").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.28 }}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}
    >
      <span className="display" style={{ fontSize: 20, color: RANK_COLORS[rank] ?? C.muted, minWidth: 28 }}>{rank}</span>

      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 14, color: C.text, flexShrink: 0, overflow: "hidden" }}>
        {racer.avatar ? (
          <img src={racer.avatar} alt={racer.username ?? "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {racer.username ?? "Anonymous"}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span className="display" style={{ fontSize: 18, color: rank === 1 ? C.gold : C.text }}>{Math.round(racer.value)}</span>
        <span style={{ fontFamily: FONT.body, fontSize: 10, color: C.muted }}> km/h</span>
      </div>
    </motion.div>
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