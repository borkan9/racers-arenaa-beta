// types/index.ts

export type SpeedUnit = "kmh" | "mph";

export type RaceModeId =
  | "free"
  | "0-100"
  | "0-200"
  | "qmile"
  | "topspeed";

export type RacePhase = "setup" | "countdown" | "racing" | "finished";
export type CountdownSeconds = 3 | 5 | 10;

export interface RaceConfig {
  mode: RaceModeId;
  unit: SpeedUnit;
  countdown: CountdownSeconds;
}

export interface TelemetrySnapshot {
  speed: number;
  topSpeed: number;
  distance: number;
  elapsed: number;
  accel: number;
  gForce: number;
  lat: number | null;
  lng: number | null;
}

export interface RoutePoint {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  speed?: number;
  ts?: number;
}

export type VerificationType = "racer" | "tuner" | "car";
export type BadgeTier = "gold" | "silver" | "platinum" | "none";

export interface RacerProfile {
  id: number;
  name: string;
  tag: string;
  car: string;
  hp: number;
  torque?: number;
  country: string;
  verified: VerificationType;
  topSpeed: number;
  bestTime: string;
  races: number;
  avatar: string;
  badge: BadgeTier;
  locked?: boolean;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

export interface RaceRecord {
  id: number;
  date: string;
  time: string;
  duration: string;
  maxSpeed: number;
  avgSpeed: number;
  route: string;
  mode: string;
  unit: SpeedUnit;
  flagged: boolean;
}

export type LeaderboardTab = "speed" | "time";

export interface PrivacySettings {
  speed: boolean;
  map: boolean;
  history: boolean;
}

export type ScreenId =
  | "home"
  | "race"
  | "board"
  | "history"
  | "explore"
  | "profile"
  | "liveData"
  | "raceScreen"
  | "admin";

export interface BadgeConfig {
  label: string;
  color: string;
}
