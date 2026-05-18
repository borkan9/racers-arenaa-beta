// types/database.types.ts
//
// Single source of truth for all Supabase table shapes.
// Re-generate this file whenever you change your schema:
//   npx supabase gen types typescript --project-id <your-project-id> > types/database.types.ts
//
// Do NOT put runtime logic here — types only.

// ─── ROOT DATABASE TYPE ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ── users ──────────────────────────────────────────────────────────────
      users: {
        Row: {
          id:         string;        // uuid — matches Supabase Auth user id
          created_at: string;        // timestamptz ISO string
          username:   string | null;
          avatar:     string | null; // public URL to avatar image
          bio:        string | null;
        };
        Insert: {
          id:         string;        // must match auth.users.id
          created_at?: string;       // defaults to now()
          username?:  string | null;
          avatar?:    string | null;
          bio?:       string | null;
        };
        Update: {
          id?:        string;
          created_at?: string;
          username?:  string | null;
          avatar?:    string | null;
          bio?:       string | null;
        };
      };

      // ── races ──────────────────────────────────────────────────────────────
      // Add this table in Supabase when you reach Phase 5.
      // Defined here now so TypeScript knows its shape in advance.
      races: {
        Row: {
          id:           string;        // uuid
          created_at:   string;        // timestamptz
          user_id:      string;        // fk → users.id
          mode:         string;        // "FREE_RUN" | "ZERO_TO_100" | etc.
          unit:         string;        // "KMH" | "MPH"
          duration_ms:  number | null; // milliseconds
          max_speed:    number;        // km/h stored internally always
          avg_speed:    number;        // km/h
          distance_km:  number;        // km
          peak_accel:   number;        // m/s²
          start_lat:    number | null;
          start_lng:    number | null;
          finish_lat:   number | null;
          finish_lng:   number | null;
          route_points: RoutePoint[] | null; // jsonb
          is_private:   boolean;
          flagged:      boolean;
          flag_reason:  string | null;
          reviewed:     boolean;
          status:       RaceStatus;
        };
        Insert: {
          id?:          string;
          created_at?:  string;
          user_id:      string;
          mode:         string;
          unit:         string;
          duration_ms?: number | null;
          max_speed:    number;
          avg_speed:    number;
          distance_km:  number;
          peak_accel?:  number;
          start_lat?:   number | null;
          start_lng?:   number | null;
          finish_lat?:  number | null;
          finish_lng?:  number | null;
          route_points?: RoutePoint[] | null;
          is_private?:  boolean;
          flagged?:     boolean;
          flag_reason?: string | null;
          reviewed?:    boolean;
          status?:      RaceStatus;
        };
        Update: {
          id?:          string;
          created_at?:  string;
          user_id?:     string;
          mode?:        string;
          unit?:        string;
          duration_ms?: number | null;
          max_speed?:   number;
          avg_speed?:   number;
          distance_km?: number;
          peak_accel?:  number;
          start_lat?:   number | null;
          start_lng?:   number | null;
          finish_lat?:  number | null;
          finish_lng?:  number | null;
          route_points?: RoutePoint[] | null;
          is_private?:  boolean;
          flagged?:     boolean;
          flag_reason?: string | null;
          reviewed?:    boolean;
          status?:      RaceStatus;
        };
      };

      // ── leaderboard_entries ────────────────────────────────────────────────
      // Add this table in Supabase when you reach Phase 6.
      leaderboard_entries: {
        Row: {
          id:           string;   // uuid
          created_at:   string;
          user_id:      string;   // fk → users.id
          race_id:      string;   // fk → races.id
          week_start:   string;   // date ISO "YYYY-MM-DD"
          mode:         string;
          board_type:   BoardType;
          value:        number;   // speed (km/h) or time (ms)
        };
        Insert: {
          id?:          string;
          created_at?:  string;
          user_id:      string;
          race_id:      string;
          week_start:   string;
          mode:         string;
          board_type:   BoardType;
          value:        number;
        };
        Update: {
          id?:          string;
          created_at?:  string;
          user_id?:     string;
          race_id?:     string;
          week_start?:  string;
          mode?:        string;
          board_type?:  BoardType;
          value?:       number;
        };
      };

    };

    Views:   Record<string, never>; // add views here as you create them
    Functions: Record<string, never>; // add RPC functions here
    Enums:   Record<string, never>;
  };
}

// ─── EMBEDDED JSON TYPES ──────────────────────────────────────────────────────

/** A single GPS point recorded during a live race, stored in jsonb. */
export interface RoutePoint {
  lat:   number;
  lng:   number;
  speed: number; // km/h
  ts:    number; // ms since race start
}

// ─── ENUM TYPES ───────────────────────────────────────────────────────────────

export type RaceStatus =
  | "ACTIVE"
  | "FINISHED"
  | "ABANDONED"
  | "FLAGGED"
  | "REMOVED";

export type BoardType =
  | "TOP_SPEED"
  | "BEST_TIME"
  | "DISTANCE";

export type RaceMode =
  | "FREE_RUN"
  | "ZERO_TO_100"
  | "ZERO_TO_200"
  | "HUNDRED_TO_200"
  | "QUARTER_MILE"
  | "HALF_MILE"
  | "TOP_SPEED"
  | "CUSTOM";

export type SpeedUnit = "KMH" | "MPH";

// ─── ROW ALIASES ─────────────────────────────────────────────────────────────
//
// Use these throughout the codebase instead of the deeply nested
// Database["public"]["Tables"]["users"]["Row"] form.

export type UserRow              = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert           = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate           = Database["public"]["Tables"]["users"]["Update"];

export type RaceRow              = Database["public"]["Tables"]["races"]["Row"];
export type RaceInsert           = Database["public"]["Tables"]["races"]["Insert"];
export type RaceUpdate           = Database["public"]["Tables"]["races"]["Update"];

export type LeaderboardEntryRow    = Database["public"]["Tables"]["leaderboard_entries"]["Row"];
export type LeaderboardEntryInsert = Database["public"]["Tables"]["leaderboard_entries"]["Insert"];