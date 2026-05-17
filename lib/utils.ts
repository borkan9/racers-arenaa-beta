// lib/utils.ts

// ─── TIME FORMATTING ──────────────────────────────────────────────────────────

/**
 * Formats milliseconds into MM:SS.cs  (or H:MM:SS when >= 1 hour)
 */
export function fmtTime(ms: number): string {
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const s  = Math.floor((ms % 60_000) / 1_000);
  const cs = Math.floor((ms % 1_000) / 10);

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ─── SPEED FORMATTING ─────────────────────────────────────────────────────────

/**
 * Returns speed formatted to one decimal in the requested unit.
 * Input is always km/h internally.
 */
export function fmtSpeed(kmh: number, unit: "kmh" | "mph"): string {
  return unit === "mph"
    ? (kmh * 0.621_371).toFixed(1)
    : kmh.toFixed(1);
}

/**
 * Converts km/h → mph or returns km/h unchanged.
 */
export function convertSpeed(kmh: number, unit: "kmh" | "mph"): number {
  return unit === "mph" ? kmh * 0.621_371 : kmh;
}

// ─── DISTANCE FORMATTING ──────────────────────────────────────────────────────

/**
 * Returns a human-readable distance string.
 * Input is always km internally.
 */
export function fmtDist(km: number, unit: "kmh" | "mph"): string {
  return unit === "mph"
    ? `${(km * 0.621_371).toFixed(3)} mi`
    : `${(km * 1_000).toFixed(0)} m`;
}

// ─── HAVERSINE DISTANCE ───────────────────────────────────────────────────────

/**
 * Great-circle distance between two GPS coordinates, in km.
 */
export function calcDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R    = 6_371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── SVG POLAR HELPERS ───────────────────────────────────────────────────────

/**
 * Converts polar coordinates (cx, cy centre, radius, angle in degrees)
 * to SVG {x, y} cartesian coords.  0° = top (12 o'clock).
 */
export function polarToXY(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * SVG arc path between two angles on a circle centred at (cx, cy).
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number
): string {
  const s     = polarToXY(cx, cy, r, fromDeg);
  const e     = polarToXY(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── COLOUR HELPERS ───────────────────────────────────────────────────────────

/**
 * Returns the speedometer arc colour based on the 0-1 progress fraction.
 */
export function speedoArcColor(pct: number): string {
  if (pct > 0.8) return "#E8350A";   // accent / danger
  if (pct > 0.6) return "#F5A623";   // gold / warning
  return "#22C55E";                   // green / safe
}

// ─── MISC ─────────────────────────────────────────────────────────────────────

/**
 * Extracts up to two uppercase initials from a full name.
 */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}