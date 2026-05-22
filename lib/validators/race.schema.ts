// lib/validators/race.schema.ts

import { z } from "zod";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_REALISTIC_SPEED_KMH = 500;
const MAX_REALISTIC_ACCEL     = 50;
const MAX_ROUTE_POINTS        = 500;
const MAX_DISTANCE_KM         = 50;

// ─── ENUMS ────────────────────────────────────────────────────────────────────

const RaceModeEnum = z.enum([
  "FREE_RUN",
  "ZERO_TO_100",
  "ZERO_TO_200",
  "HUNDRED_TO_200",
  "QUARTER_MILE",
  "HALF_MILE",
  "TOP_SPEED",
  "CUSTOM",
]);

const SpeedUnitEnum = z.enum(["KMH", "MPH"]);

const RaceStatusEnum = z.enum([
  "ACTIVE",
  "FINISHED",
  "ABANDONED",
  "FLAGGED",
  "REMOVED",
]);

// ─── ROUTE POINT ─────────────────────────────────────────────────────────────

const RoutePointSchema = z.object({
  lat:   z.number().min(-90).max(90),
  lng:   z.number().min(-180).max(180),
  speed: z.number().min(0).max(MAX_REALISTIC_SPEED_KMH),
  ts:    z.number().min(0),
});

// ─── CREATE RACE ─────────────────────────────────────────────────────────────

export const CreateRaceSchema = z.object({
  mode:         RaceModeEnum,
  unit:         SpeedUnitEnum,
  duration_ms:  z
    .number()
    .min(0)
    .max(3_600_000)
    .nullable()
    .optional(),
  max_speed:    z
    .number()
    .min(0)
    .max(MAX_REALISTIC_SPEED_KMH, `Max speed cannot exceed ${MAX_REALISTIC_SPEED_KMH} km/h.`),
  avg_speed:    z
    .number()
    .min(0)
    .max(MAX_REALISTIC_SPEED_KMH),
  distance_km:  z
    .number()
    .min(0)
    .max(MAX_DISTANCE_KM, `Distance cannot exceed ${MAX_DISTANCE_KM} km.`),
  peak_accel:   z
    .number()
    .min(0)
    .max(MAX_REALISTIC_ACCEL, `Peak acceleration cannot exceed ${MAX_REALISTIC_ACCEL} m/s².`)
    .optional()
    .default(0),
  start_lat:    z.number().min(-90).max(90).nullable().optional(),
  start_lng:    z.number().min(-180).max(180).nullable().optional(),
  finish_lat:   z.number().min(-90).max(90).nullable().optional(),
  finish_lng:   z.number().min(-180).max(180).nullable().optional(),
  route_points: z
    .array(RoutePointSchema)
    .max(MAX_ROUTE_POINTS, `Route cannot exceed ${MAX_ROUTE_POINTS} points.`)
    .nullable()
    .optional(),
  is_private:   z.boolean().optional().default(false),
})
.refine(
  (data) => data.avg_speed <= data.max_speed,
  {
    message: "avg_speed cannot be greater than max_speed.",
    path:    ["avg_speed"],
  },
)
.refine(
  (data) => {
    if (data.unit === "MPH") {
      return data.max_speed <= MAX_REALISTIC_SPEED_KMH;
    }
    return true;
  },
  {
    message: "Speed values must be converted to KMH before submitting.",
    path:    ["max_speed"],
  },
);

// ─── ADMIN UPDATE RACE ────────────────────────────────────────────────────────

export const AdminRaceActionSchema = z.object({
  race_id: z.string().uuid("Invalid race ID."),
  action:  z.enum(["approve", "remove"]),
  note:    z.string().max(500).optional().default(""),
});

// ─── QUERY PARAMS ─────────────────────────────────────────────────────────────

export const RaceListQuerySchema = z.object({
  limit:   z.coerce.number().int().min(1).max(50).default(20),
  offset:  z.coerce.number().int().min(0).default(0),
  user_id: z.string().uuid().optional(),
});

// ─── INFERRED TYPES ───────────────────────────────────────────────────────────

export type CreateRaceInput      = z.infer<typeof CreateRaceSchema>;
export type AdminRaceActionInput = z.infer<typeof AdminRaceActionSchema>;
export type RaceListQueryInput   = z.infer<typeof RaceListQuerySchema>;

// ─── VALIDATION HELPER ────────────────────────────────────────────────────────

export function validate<T>(
  schema: z.ZodSchema<T>,
  input:  unknown,
): { success: true; data: T; error?: never } | { success: false; error: string; data?: never } {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const message    = firstError
      ? `${firstError.path.join(".")}: ${firstError.message}`
      : "Invalid input.";
    return { success: false, error: message };
  }

  return { success: true, data: result.data };
}