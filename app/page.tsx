// app/page.tsx

"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { HomeScreen } from "@/screens/HomeScreen";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { C, FONT, NAV_ITEMS, GLOBAL_CSS } from "@/lib/constants";
import type { ScreenId } from "@/types";

const RaceScreen = dynamic(
  () => import("@/screens/RaceScreen").then((mod) => mod.RaceScreen),
  { loading: () => <ScreenLoader label="LOADING RACE…" /> },
);
const LeaderboardScreen = dynamic(
  () => import("@/screens/LeaderboardScreen").then((mod) => mod.LeaderboardScreen),
  { loading: () => <ScreenLoader label="LOADING BOARD…" /> },
);
const HistoryScreen = dynamic(
  () => import("@/screens/HistoryScreen").then((mod) => mod.HistoryScreen),
  { loading: () => <ScreenLoader label="LOADING HISTORY…" /> },
);
const ExploreScreen = dynamic(
  () => import("@/screens/ExploreScreen").then((mod) => mod.ExploreScreen),
  { loading: () => <ScreenLoader label="LOADING RACERS…" /> },
);
const ProfileScreen = dynamic(
  () => import("@/screens/ProfileScreen").then((mod) => mod.ProfileScreen),
  { loading: () => <ScreenLoader label="LOADING PROFILE…" /> },
);
const LiveDataScreen = dynamic(
  () => import("@/screens/LiveDataScreen").then((mod) => mod.LiveDataScreen),
  { loading: () => <ScreenLoader label="LOADING LIVE DATA…" /> },
);
const AdminPanel = dynamic(
  () => import("@/screens/AdminPanel").then((mod) => mod.AdminPanel),
  { loading: () => <ScreenLoader label="LOADING ADMIN…" /> },
);

const RESPONSIVE_CSS = `
  body {
    min-width: 320px;
    background:
      radial-gradient(circle at 50% -20%, rgba(232,53,10,.10), transparent 38%),
      #0A0A0B;
  }

  .ra-shell {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    background: ${C.bg};
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .ra-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px 8px;
    background: rgba(10,10,11,.94);
    backdrop-filter: blur(14px);
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid ${C.border};
  }

  .ra-main {
    flex: 1;
    overflow-x: hidden;
    padding-bottom: 72px;
  }

  .ra-main--full {
    padding-bottom: 0;
  }

  .ra-content {
    min-height: 100%;
    width: 100%;
  }

  .ra-nav {
    display: flex;
    background: rgba(17,17,20,.97);
    backdrop-filter: blur(16px);
    border-top: 1px solid ${C.border};
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    z-index: 50;
  }

  .ra-nav-button {
    flex: 1;
    padding: 10px 4px 14px;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: transform .15s ease, background .15s ease, border-color .15s ease;
  }

  .ra-nav-button--desktop { display: none; }
  .ra-nav-button:hover { transform: translateY(-1px); }

  @media (min-width: 820px) {
    body { padding: 0 24px 32px; }

    .ra-shell {
      max-width: 1280px;
      min-height: calc(100vh - 32px);
      margin: 0 auto;
      border-left: 1px solid rgba(255,255,255,.05);
      border-right: 1px solid rgba(255,255,255,.05);
      box-shadow: 0 24px 80px rgba(0,0,0,.35);
    }

    .ra-header {
      padding: 20px 32px;
    }

    .ra-brand {
      font-size: 28px !important;
      letter-spacing: 7px !important;
    }

    .ra-nav {
      position: sticky;
      top: 69px;
      bottom: auto;
      left: auto;
      transform: none;
      width: auto;
      max-width: none;
      margin: 14px 24px 0;
      border: 1px solid ${C.border};
      border-radius: 14px;
      overflow: hidden;
      z-index: 35;
      box-shadow: 0 12px 40px rgba(0,0,0,.22);
    }

    .ra-nav-button {
      min-height: 58px;
      padding: 10px 14px;
      flex-direction: row;
      gap: 9px;
      border-top: none !important;
      border-bottom: 2px solid transparent;
    }

    .ra-nav-button--desktop { display: flex; }
    .ra-nav-button > span:first-child { font-size: 20px !important; }
    .ra-nav-button > span:last-child { font-size: 10px !important; letter-spacing: 2px !important; }

    .ra-main,
    .ra-main--full {
      padding-bottom: 24px;
      overflow: visible;
    }

    .ra-content {
      max-width: 1120px;
      margin: 0 auto;
      padding: 10px 28px 36px;
    }

    .ra-content--full {
      max-width: none;
      padding: 0;
    }
  }

  @media (min-width: 1200px) {
    .ra-content { padding-left: 48px; padding-right: 48px; }
  }
`;

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const FULL_SCREEN_IDS = new Set<ScreenId>(["raceScreen", "admin"]);

function ScreenLoader({ label }: { label: string }) {
  return (
    <div style={{ minHeight: "60vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, animation: "spin-slow 0.8s linear infinite" }} />
      <span style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 11, letterSpacing: 3, color: C.muted }}>{label}</span>
    </div>
  );
}

function AuthRequired({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) return <ScreenLoader label="LOADING…" />;

  if (!isAuthenticated) {
    window.location.href = "/auth/signin?redirectTo=/";
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");
  const { isAuthenticated } = useSession();
  const { profile } = useProfile();

  const isAdmin = (profile as any)?.role === "admin";

  const navigate = useCallback((dest: ScreenId) => {
    const authRequired: ScreenId[] = ["raceScreen", "race", "history", "profile"];

    if (dest === "admin" && !isAdmin) return;

    if (authRequired.includes(dest) && !isAuthenticated) {
      window.location.href = "/auth/signin?redirectTo=/";
      return;
    }
    setScreen(dest);
  }, [isAuthenticated, isAdmin]);

  const hideNav = FULL_SCREEN_IDS.has(screen);

  return (
    <>
      <style>{`${GLOBAL_CSS}\n${RESPONSIVE_CSS}`}</style>
      <div className="ra-shell">
        {!hideNav && (
          <header className="ra-header">
            <div className="display ra-brand" style={{ fontSize: 22, letterSpacing: 5, color: C.text, lineHeight: 1 }}>
              RACERS<span style={{ color: C.accent }}>·</span>ARENA
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isAdmin && (
                <button
                  onClick={() => setScreen("admin")}
                  style={{ background: "none", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "7px 14px", color: C.accent, cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}
                >
                  ADMIN
                </button>
              )}

              {!isAuthenticated && (
                <button
                  onClick={() => window.location.href = "/auth/signin"}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 16px", color: C.white, cursor: "pointer", fontFamily: FONT.display, fontSize: 14, letterSpacing: 3 }}
                >
                  SIGN IN
                </button>
              )}
            </div>
          </header>
        )}

        {!hideNav && (
          <nav className="ra-nav">
            {(NAV_ITEMS as unknown as { id: string; icon: string; label: string; action?: boolean; desktopOnly?: boolean }[]).map((item) => {
              const active = screen === item.id || (item.id === "race" && screen === "raceScreen");
              const dest = item.id === "race" ? "raceScreen" : item.id as ScreenId;

              return (
                <button
                  key={item.id}
                  className={`ra-nav-button${item.desktopOnly ? " ra-nav-button--desktop" : ""}`}
                  onClick={() => navigate(dest)}
                  style={{
                    background: item.action ? C.accent : active ? `${C.accent}12` : "transparent",
                    borderTop: active && !item.action ? `2px solid ${C.accent}` : "2px solid transparent",
                    color: item.action ? C.white : active ? C.accent : C.muted,
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ fontFamily: FONT.body, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "inherit" }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        <main className={hideNav ? "ra-main ra-main--full" : "ra-main"}>
          <div className={hideNav ? "ra-content ra-content--full" : "ra-content"}>
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
                {screen === "home" && <HomeScreen onNavigate={navigate} />}
                {screen === "board" && <LeaderboardScreen />}
                {screen === "explore" && <ExploreScreen />}
                {screen === "liveData" && <LiveDataScreen />}

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

                {screen === "admin" && isAdmin && <AdminPanel onBack={navigate} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
