// components/CountdownOverlay.tsx

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, FONT } from "@/lib/constants";
import type { CountdownSeconds } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CountdownOverlayProps {
  /** Starting number for the countdown (3, 5, or 10). */
  from:       CountdownSeconds;
  /** Called once the "GO!" animation finishes. */
  onComplete: () => void;
}

type Phase = "count" | "go";

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────────────

const digitVariants = {
  initial: { scale: 2.5, opacity: 0 },
  animate: { scale: 1,   opacity: 1 },
  exit:    { scale: 0.5, opacity: 0 },
};

const goVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1,   opacity: 1 },
  exit:    { scale: 0.8, opacity: 0 },
};

const transition = {
  duration:   0.3,
  ease:       [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function CountdownOverlay({ from, onComplete }: CountdownOverlayProps) {
  const [n,     setN]     = useState<number>(from);
  const [phase, setPhase] = useState<Phase>("count");

  useEffect(() => {
    if (phase === "go") {
      // Stay on "GO!" briefly, then fire the callback
      const id = setTimeout(onComplete, 900);
      return () => clearTimeout(id);
    }

    if (n > 0) {
      const id = setTimeout(() => setN((prev) => prev - 1), 1_000);
      return () => clearTimeout(id);
    }

    // n === 0 → transition to "go"
    setPhase("go");
  }, [n, phase, onComplete]);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         100,
        background:     "rgba(0,0,0,0.88)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
      }}
    >
      {/* Carbon-fibre texture overlay */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          backgroundImage:
            "repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0,rgba(255,255,255,0.02) 1px,transparent 0,transparent 50%)",
          backgroundSize: "8px 8px",
          pointerEvents:  "none",
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "count" ? (
          <motion.div
            key={`digit-${n}`}
            variants={digitVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{
              position:   "relative",
              fontFamily: FONT.display,
              fontSize:   "clamp(120px, 40vw, 220px)",
              lineHeight: 1,
              color:      C.accent,
              textShadow: `0 0 80px ${C.accent}60`,
            }}
          >
            {n === 0 ? "" : n}
          </motion.div>
        ) : (
          <motion.div
            key="go"
            variants={goVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{
              position:      "relative",
              fontFamily:    FONT.display,
              fontSize:      "clamp(80px, 30vw, 180px)",
              lineHeight:    1,
              color:         C.green,
              letterSpacing: 8,
              textShadow:    `0 0 80px ${C.green}90`,
            }}
          >
            GO!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-label */}
      <div
        style={{
          position:      "relative",
          color:         C.muted,
          fontFamily:    FONT.body,
          fontWeight:    700,
          fontSize:      14,
          letterSpacing: 4,
          marginTop:     20,
        }}
      >
        {phase === "count" ? "GET READY" : "RACE STARTED"}
      </div>
    </div>
  );
}