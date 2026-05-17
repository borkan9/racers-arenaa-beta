// types/index.ts

// ─── UNITS ────────────────────────────────────────────────────────────────────

export type SpeedUnit = "kmh" | "mph";

// ─── RACE ─────────────────────────────────────────────────────────────────────

export type RaceModeId =
  | "free"
  | "0-100"
  | "0-200"
  | "qmile"
  | "topspeed";

export type RacePhase =
  | "setup"
  | "countdown"
  | "racing"
  | "finished";

export type CountdownSeconds = 3 | 5 | 10;

export interface RaceConfig {
  mode:      RaceModeId;
  unit:      SpeedUnit;
  countdown: CountdownSeconds;
}

// ─── TELEMETRY ────────────────────────────────────────────────────────────────

export interface TelemetrySnapshot {
  speed:    number;   // km/h (always stored internally as km/h)
  topSpeed: number;   // km/h
  distance: number;   // km
  elapsed:  number;   // ms since race start
  accel:    number;   // m/s²
  gForce:   number;   // G
  lat:      number | null;
  lng:      number | null;
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────

/** A single point recorded during a live race. */
export interface RoutePoint {
  /** SVG x coordinate (0–400) used by the fallback LiveMap */
  x: number;
  /** SVG y coordinate (0–300) used by the fallback LiveMap */
  y: number;
  /** Actual GPS latitude (null when GPS unavailable) */
  lat?: number;
  /** Actual GPS longitude (null when GPS unavailable) */
  lng?: number;
  /** Speed at this point in km/h */
  speed?: number;
  /** Milliseconds since race start */
  ts?: number;
}

// ─── RACER PROFILE ────────────────────────────────────────────────────────────

export type VerificationType = "racer" | "tuner" | "car";

export type BadgeTier = "gold" | "silver" | "platinum" | "none";

export interface RacerProfile {
  id:        number;
  name:      string;
  tag:       string;
  car:       string;
  hp:        number;
  torque?:   number;
  country:   string;   // emoji flag, e.g. "🇦🇪"
  verified:  VerificationType;
  topSpeed:  number;   // km/h
  bestTime:  string;   // formatted "MM:SS.cc"
  races:     number;
  avatar:    string;   // 2-letter initials
  badge:     BadgeTier;
  /** When true the profile appears in search but stats are hidden */
  locked?:   boolean;
  instagram?: string;
  twitter?:   string;
  youtube?:   string;
}

// ─── RACE HISTORY ─────────────────────────────────────────────────────────────

export interface RaceRecord {
  id:        number;
  date:      string;   // "May 14, 2026"
  time:      string;   // "22:15"
  duration:  string;   // "00:38.42"
  maxSpeed:  number;   // km/h
  avgSpeed:  number;   // km/h
  route:     string;   // location label
  mode:      string;   // race mode label
  unit:      SpeedUnit;
  flagged:   boolean;
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export type LeaderboardTab = "speed" | "time";

// ─── PRIVACY SETTINGS ────────────────────────────────────────────────────────

export interface PrivacySettings {
  speed:   boolean;
  map:     boolean;
  history: boolean;
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

export type ScreenId =
  | "home"
  | "race"
  | "board"
  | "history"
  | "explore"
  | "profile"
  | "raceScreen"
  | "admin";

// ─── BADGE CONFIG ────────────────────────────────────────────────────────────

export interface BadgeConfig {
  label: string;
  color: string;
}