// lib/constants.ts

export const APP_NAME = "RACERS ARENA";
export const APP_SLOGAN = "NO BRAKES — NO MERCY";

// ─── COLORS ──────────────────────────────────────────────────────────────────
export const C = {
  bg:        "#0A0A0B",
  surface:   "#111114",
  card:      "#17171C",
  border:    "#2A2A35",
  borderHot: "#E8350A",
  accent:    "#E8350A",
  accentDim: "#9B2307",
  gold:      "#F5A623",
  text:      "#F0EEE8",
  muted:     "#6B6B78",
  dim:       "#3A3A45",
  green:     "#22C55E",
  blue:      "#3B82F6",
  yellow:    "#EAB308",
  white:     "#FFFFFF",
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────
export const FONT = {
  display: "'Bebas Neue', sans-serif",
  body:    "'Rajdhani', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;

// ─── FONT IMPORT URL ─────────────────────────────────────────────────────────
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap";

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
  @import url('${GOOGLE_FONTS_URL}');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: ${FONT.body}; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${C.surface}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  .mono { font-family: ${FONT.mono}; }
  .display { font-family: ${FONT.display}; }

  @keyframes pulse-ring {
    0%,100% { transform: scale(1); opacity: .6; }
    50%      { transform: scale(1.06); opacity: 1; }
  }
  @keyframes blink {
    0%,49%  { opacity: 1; }
    50%,99% { opacity: 0; }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 12px ${C.accent}40; }
    50%     { box-shadow: 0 0 28px ${C.accent}80; }
  }
  @keyframes track-draw {
    from { stroke-dashoffset: 1000; }
    to   { stroke-dashoffset: 0; }
  }
`;

// ─── RACE MODES ───────────────────────────────────────────────────────────────
export const RACE_MODES = [
  { id: "free",     label: "Free Run"      },
  { id: "0-100",    label: "0 → 100"       },
  { id: "0-200",    label: "0 → 200"       },
  { id: "qmile",   label: "Quarter Mile"  },
  { id: "topspeed", label: "Top Speed"     },
] as const;

// ─── COUNTDOWN OPTIONS ────────────────────────────────────────────────────────
export const COUNTDOWN_OPTIONS = [3, 5, 10] as const;

// ─── SPEED UNITS ─────────────────────────────────────────────────────────────
export const SPEED_UNITS = ["kmh", "mph"] as const;

// ─── SPEEDOMETER DEFAULTS ────────────────────────────────────────────────────
export const SPEEDO_MAX_KMH = 300;
export const SPEEDO_MAX_MPH = 200;
export const SPEEDO_START_ANGLE = -220;
export const SPEEDO_END_ANGLE   =   40;

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: "home",    icon: "⚡", label: "HOME"    },
  { id: "race",    icon: "🏁", label: "RACE",    action: true },
  { id: "board",   icon: "🏆", label: "RANKS"   },
  { id: "history", icon: "📊", label: "HISTORY" },
  { id: "explore", icon: "🌍", label: "EXPLORE" },
  { id: "profile", icon: "👤", label: "PROFILE" },
] as const;

// ─── BADGE CONFIG ─────────────────────────────────────────────────────────────
export const BADGE_CONFIG = {
  racer: { label: "VERIFIED RACER", color: "#E8350A" },
  tuner: { label: "VERIFIED TUNER", color: "#3B82F6" },
  car:   { label: "VERIFIED CAR",   color: "#F5A623" },
} as const;

// ─── ANTI-CHEAT THRESHOLDS ───────────────────────────────────────────────────
export const ANTICHEAT = {
  MAX_ACCELERATION_MS2: 50,
  MAX_SPEED_KMH:        500,
  MAX_TELEPORT_KM:      0.5,
  MAX_SPEED_JUMP_PER_S: 80,
} as const;

// ─── ROUTE LIMITS ─────────────────────────────────────────────────────────────
export const MAX_ROUTE_POINTS = 500;

// ─── TELEMETRY INTERVALS ─────────────────────────────────────────────────────
export const TELEMETRY_INTERVAL_MS  = 500;
export const TIMER_INTERVAL_MS      =  50;
export const DEMO_SPEED_INTERVAL_MS =  80;