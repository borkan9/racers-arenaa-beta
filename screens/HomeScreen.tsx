// screens/HomeScreen.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Speedometer } from "@/components/Speedometer";
import { C, FONT, DEMO_SPEED_INTERVAL_MS, SPEEDO_MAX_KMH } from "@/lib/constants";
import type { ScreenId } from "@/types";

interface HomeScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface QuickStat {
  val: string;
  label: string;
}

function useDemoSpeed(): number {
  const [speed, setSpeed] = useState(0);
  const dirRef = React.useRef<1 | -1>(1);

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed((prev) => {
        const next = prev + dirRef.current * (2 + Math.random() * 4);
        if (next >= 260) { dirRef.current = -1; return 260; }
        if (next <= 0) { dirRef.current = 1; return 0; }
        return next;
      });
    }, DEMO_SPEED_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return speed;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const demoSpeed = useDemoSpeed();
  const [stats, setStats] = useState<QuickStat[]>([
    { val: "0", label: "RACERS" },
    { val: "0", label: "TOP KM/H" },
    { val: "0", label: "RUNS" },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const statsRes = await fetch("/api/home");

      if (statsRes.ok) {
        const body = await statsRes.json();
        setStats([
          { val: String(body.total_racers ?? 0), label: "RACERS" },
          { val: String(Math.round(body.top_speed ?? 0)), label: "TOP KM/H" },
          { val: String(body.total_races ?? 0), label: "RUNS" },
        ]);
      }
    } catch (err) {
      console.error("[HomeScreen] fetch error:", err);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div style={{ minHeight: "100%", background: C.bg }}>
      <div style={{ padding: "40px 20px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 0,transparent 50%)", backgroundSize: "8px 8px", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <h1 className="display" style={{ fontSize: "clamp(72px,22vw,108px)", lineHeight: 0.9, color: C.text, marginBottom: 20 }}>REDLINE</h1>
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

      </div>
    </div>
  );
}
