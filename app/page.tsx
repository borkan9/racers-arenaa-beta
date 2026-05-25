// app/page.tsx

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter }             from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { HomeScreen }        from "@/screens/HomeScreen";
import { RaceScreen }        from "@/screens/RaceScreen";
import { LeaderboardScreen } from "@/screens/LeaderboardScreen";
import { HistoryScreen }     from "@/screens/HistoryScreen";
import { ExploreScreen }     from "@/screens/ExploreScreen";
import { ProfileScreen }     from "@/screens/ProfileScreen";
import { AdminPanel }        from "@/screens/AdminPanel";
import { useSession }        from "@/hooks/useSession";
import { C, FONT, NAV_ITEMS, GLOBAL_CSS } from "@/lib/constants";
import type { ScreenId }     from "@/types";

// ─── SCREEN TRANSITION ────────────────────────────────────────────────────────

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -12 },
};

const FULL_SCREEN_IDS = new Set<ScreenId>(["raceScreen", "admin"]);

// ─── AUTH GUARD WRAPPER ───────────────────────────────────────────────────────

function AuthRequired({
  children,
  fallback,
}: {
  children:  React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin?redirectTo=/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight:      "100vh",
          background:     C.bg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexDirection:  "column",
          gap:            16,
        }}
      >
        <div
          style={{
            width:        40,
            height:       40,
            borderRadius: "50%",
            border:       `3px solid ${C.border}`,
            borderTop:    `3px solid ${C.accent}`,
            animation:    "spin-slow 0.8s linear infinite",
          }}
        />
        <span
          style={{
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      11,
            letterSpacing: 3,
            color:         C.muted,
          }}
        >
          LOADING…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const { isAuthenticated } = useSession();

  const navigate = useCallback((dest: ScreenId) => {
    // Guard nav items that need auth
    const authRequired: ScreenId[] = ["raceScreen", "race", "history", "profile", "admin"];
    if (authRequired.includes(dest) && !isAuthenticated) {
      window.location.href = "/auth/signin?redirectTo=/";
      return;
    }
    setScreen(dest);
  }, [isAuthenticated]);

  const hideNav = FULL_SCREEN_IDS.has(screen);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div
        style={{
          minHeight:     "100vh",
          background:    C.bg,
          display:       "flex",
          flexDirection: "column",
          maxWidth:      480,
          margin:        "0 auto",
          position:      "relative",
        }}
      >
        {/* ── Top bar ── */}
        {!hideNav && (
          <header
            style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              padding:        "16px 20px 8px",
              background:     C.bg,
              position:       "sticky",
              top:            0,
              zIndex:         20,
              borderBottom:   `1px solid ${C.border}`,
            }}
          >
            <div
              className="display"
              style={{ fontSize: 22, letterSpacing: 5, color: C.text, lineHeight: 1 }}
            >
              RACERS<span style={{ color: C.accent }}>·</span>ARENA
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  {!isAuthenticated && (
    <button
      onClick={() => window.location.href = "/auth/signin"}
      style={{
        background:    C.accent,
        border:        "none",
        borderRadius:  6,
        padding:       "6px 14px",
        color:         C.white,
        cursor:        "pointer",
        fontFamily:    FONT.display,
        fontSize:      14,
        letterSpacing: 3,
      }}
    >
      SIGN IN
    </button>
  )}
</div>
          </header>
        )}

        {/* ── Screen content ── */}
        <main
          style={{
            flex:          1,
            overflowY:     "auto",
            overflowX:     "hidden",
            paddingBottom: hideNav ? 0 : 72,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              variants={screenVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              style={{ minHeight: "100%" }}
            >
              {/* Public screens */}
              {screen === "home"    && <HomeScreen onNavigate={navigate} />}
              {screen === "board"   && <LeaderboardScreen />}
              {screen === "explore" && <ExploreScreen />}

              {/* Auth-required screens */}
              {(screen === "raceScreen" || screen === "race") && (
                <AuthRequired>
                  <RaceScreen onExit={navigate} />
                </AuthRequired>
              )}

              {screen === "history" && (
                <AuthRequired>
                  <HistoryScreen />
                </AuthRequired>
              )}

              {screen === "profile" && (
                <AuthRequired>
                  <ProfileScreen />
                </AuthRequired>
              )}

              {screen === "admin" && (
                <AuthRequired>
                  <AdminPanel onBack={navigate} />
                </AuthRequired>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Bottom nav ── */}
        {!hideNav && (
          <nav
            style={{
              display:   "flex",
              background: C.surface,
              borderTop:  `1px solid ${C.border}`,
              position:   "fixed",
              bottom:     0,
              left:       "50%",
              transform:  "translateX(-50%)",
              width:      "100%",
              maxWidth:   480,
              zIndex:     30,
            }}
          >
            {(NAV_ITEMS as unknown as { id: string; icon: string; label: string; action?: boolean }[]).map((item) => {
              const active = screen === item.id || (item.id === "race" && screen === "raceScreen");
              const dest   = item.id === "race" ? "raceScreen" : item.id as ScreenId;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(dest)}
                  style={{
                    flex:          1,
                    padding:       "10px 4px 14px",
                    background:    item.action ? C.accent : active ? `${C.accent}12` : "none",
                    border:        "none",
                    cursor:        "pointer",
                    display:       "flex",
                    flexDirection: "column",
                    alignItems:    "center",
                    gap:           3,
                    borderTop:     active && !item.action ? `2px solid ${C.accent}` : "2px solid transparent",
                    transition:    "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                  <span
                    style={{
                      fontFamily:    FONT.body,
                      fontSize:      8,
                      fontWeight:    700,
                      letterSpacing: 1.5,
                      color:         item.action ? C.white : active ? C.accent : C.muted,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}