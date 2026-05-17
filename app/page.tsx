// app/page.tsx

"use client";

import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HomeScreen }        from "@/screens/HomeScreen";
import { RaceScreen }        from "@/screens/RaceScreen";
import { LeaderboardScreen } from "@/screens/LeaderboardScreen";
import { HistoryScreen }     from "@/screens/HistoryScreen";
import { ExploreScreen }     from "@/screens/ExploreScreen";
import { ProfileScreen }     from "@/screens/ProfileScreen";
import { AdminPanel }        from "@/screens/AdminPanel";
import { C, FONT, NAV_ITEMS, GLOBAL_CSS } from "@/lib/constants";
import type { ScreenId } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface NavItem {
  id:      string;
  icon:    string;
  label:   string;
  action?: boolean;
}

// ─── SCREEN TRANSITION VARIANTS ───────────────────────────────────────────────

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -12 },
};

const screenTransition = { duration: 0.2, ease: "easeInOut" as const };

// ─── SCREENS THAT HIDE THE NAV BAR ───────────────────────────────────────────

const FULL_SCREEN_IDS = new Set<ScreenId>(["raceScreen", "admin"]);

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("home");

  const navigate = useCallback((dest: ScreenId) => {
    setScreen(dest);
  }, []);

  const hideNav = FULL_SCREEN_IDS.has(screen);

  return (
    <>
      {/* ── Inject global CSS (fonts + keyframes) ── */}
      <style>{GLOBAL_CSS}</style>

      {/*
       * Outer shell: centres content to max 480 px, matches a phone viewport.
       * On desktop the chrome surrounds the centred column.
       */}
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
        {/* ── Global top logo bar ── */}
        {!hideNav && <TopLogoBar onAdminClick={() => navigate("admin")} />}

        {/* ── Screen content ── */}
        <main
          style={{
            flex:       1,
            overflowY:  "auto",
            overflowX:  "hidden",
            // Leave room for the fixed bottom nav
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
              transition={screenTransition}
              style={{ minHeight: "100%" }}
            >
              <ScreenRenderer screen={screen} onNavigate={navigate} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Bottom navigation bar ── */}
        {!hideNav && (
          <BottomNav current={screen} onNavigate={navigate} />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN RENDERER
// ─────────────────────────────────────────────────────────────────────────────

interface ScreenRendererProps {
  screen:     ScreenId;
  onNavigate: (dest: ScreenId) => void;
}

function ScreenRenderer({ screen, onNavigate }: ScreenRendererProps) {
  switch (screen) {
    case "home":
      return <HomeScreen onNavigate={onNavigate} />;

    case "raceScreen":
      return (
        <RaceScreen
          onExit={(dest) => onNavigate(dest)}
        />
      );

    case "board":
      return <LeaderboardScreen />;

    case "history":
      return <HistoryScreen />;

    case "explore":
      return <ExploreScreen />;

    case "profile":
      return <ProfileScreen />;

    case "admin":
      return (
        <AdminPanel
          onBack={(dest) => onNavigate(dest)}
        />
      );

    // "race" nav tab → immediately go to race setup
    case "race":
      return <RaceScreen onExit={(dest) => onNavigate(dest)} />;

    default:
      return <HomeScreen onNavigate={onNavigate} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP LOGO BAR
// ─────────────────────────────────────────────────────────────────────────────

interface TopLogoBarProps {
  onAdminClick: () => void;
}

function TopLogoBar({ onAdminClick }: TopLogoBarProps) {
  return (
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
      {/* Wordmark */}
      <div
        className="display"
        style={{
          fontSize:      22,
          letterSpacing: 5,
          color:         C.text,
          lineHeight:    1,
        }}
      >
        RACERS
        <span style={{ color: C.accent }}>·</span>
        ARENA
      </div>

      {/* Admin shortcut */}
      <button
        onClick={onAdminClick}
        style={{
          background:    "none",
          border:        `1px solid ${C.border}`,
          borderRadius:  6,
          padding:       "5px 12px",
          color:         C.muted,
          cursor:        "pointer",
          fontFamily:    FONT.body,
          fontWeight:    700,
          fontSize:      11,
          letterSpacing: 2,
          transition:    "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.accent;
          (e.currentTarget as HTMLButtonElement).style.color       = C.accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
          (e.currentTarget as HTMLButtonElement).style.color       = C.muted;
        }}
      >
        ADMIN
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAVIGATION BAR
// ─────────────────────────────────────────────────────────────────────────────

interface BottomNavProps {
  current:    ScreenId;
  onNavigate: (dest: ScreenId) => void;
}

function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav
      style={{
        display:    "flex",
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
      {(NAV_ITEMS as unknown as NavItem[]).map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={current === item.id || (item.id === "race" && current === "raceScreen")}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

// ─── NAV BUTTON ───────────────────────────────────────────────────────────────

interface NavButtonProps {
  item:       NavItem;
  active:     boolean;
  onNavigate: (dest: ScreenId) => void;
}

function NavButton({ item, active, onNavigate }: NavButtonProps) {
  const isCta = Boolean(item.action);

  // CTA (RACE) button styles
  const ctaStyle: React.CSSProperties = {
    flex:          1,
    padding:       "10px 4px 14px",
    background:    C.accent,
    border:        "none",
    cursor:        "pointer",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           3,
    borderTop:     "2px solid transparent",
    transition:    "background 0.15s",
  };

  // Regular button styles
  const regularStyle: React.CSSProperties = {
    flex:          1,
    padding:       "10px 4px 14px",
    background:    active ? `${C.accent}12` : "none",
    border:        "none",
    cursor:        "pointer",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           3,
    borderTop:     active ? `2px solid ${C.accent}` : "2px solid transparent",
    transition:    "background 0.15s",
  };

  const dest = item.id === "race" ? "raceScreen" : (item.id as ScreenId);

  return (
    <button
      onClick={() => onNavigate(dest)}
      style={isCta ? ctaStyle : regularStyle}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      {/* Icon */}
      <span style={{ fontSize: 18, lineHeight: 1 }}>
        {item.icon}
      </span>

      {/* Label */}
      <span
        style={{
          fontFamily:    FONT.body,
          fontSize:      8,
          fontWeight:    700,
          letterSpacing: 1.5,
          color:         isCta
            ? C.white
            : active
              ? C.accent
              : C.muted,
          lineHeight:    1,
        }}
      >
        {item.label}
      </span>
    </button>
  );
}