// lib/validators/user.schema.ts
//
// Zod schemas for all user-related API input validation.
// Import these in API routes to validate request bodies before
// touching the database. Never trust raw request input.

import { z } from "zod";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN   = 3;
const USERNAME_MAX   = 30;
const BIO_MAX        = 160;
const AVATAR_MAX_URL = 500;

// ─── FIELD SCHEMAS ────────────────────────────────────────────────────────────

const usernameSchema = z
  .string()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters.`)
  .regex(USERNAME_REGEX, "Username can only contain letters, numbers, and underscores.")
  .transform((val) => val.toLowerCase().trim());

const bioSchema = z
  .string()
  .max(BIO_MAX, `Bio must be at most ${BIO_MAX} characters.`)
  .nullable()
  .optional()
  .transform((val) => val?.trim() ?? null);

const avatarSchema = z
  .string()
  .url("Avatar must be a valid URL.")
  .max(AVATAR_MAX_URL, "Avatar URL is too long.")
  .nullable()
  .optional();

// ─── REQUEST SCHEMAS ──────────────────────────────────────────────────────────

/**
 * Schema for PATCH /api/profile
 * All fields optional — only provided fields are updated.
 */
export const UpdateProfileSchema = z.object({
  username: usernameSchema.optional(),
  bio:      bioSchema,
  avatar:   avatarSchema,
});

/**
 * Schema for initial profile creation / onboarding.
 * Username is required on first setup.
 */
export const CreateProfileSchema = z.object({
  username: usernameSchema,
  bio:      bioSchema,
  avatar:   avatarSchema,
});

/**
 * Schema for username availability check.
 * GET /api/profile/username-check?username=xxx
 */
export const UsernameCheckSchema = z.object({
  username: usernameSchema,
});

/**
 * Schema for user search query params.
 * GET /api/explore?q=xxx&limit=20&offset=0
 */
export const SearchUsersSchema = z.object({
  q:      z.string().min(1).max(50).trim(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── INFERRED TYPES ───────────────────────────────────────────────────────────
// Use these as TypeScript types throughout the API layer.

export type UpdateProfileInput  = z.infer<typeof UpdateProfileSchema>;
export type CreateProfileInput  = z.infer<typeof CreateProfileSchema>;
export type UsernameCheckInput  = z.infer<typeof UsernameCheckSchema>;
export type SearchUsersInput    = z.infer<typeof SearchUsersSchema>;

// ─── VALIDATION HELPER ────────────────────────────────────────────────────────

/**
 * Safely parses and validates data against a Zod schema.
 * Returns { success, data, error } — never throws.
 *
 * @example
 * const result = validate(UpdateProfileSchema, await req.json());
 * if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
 * const { username } = result.data;
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  input:  unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstError = result.error.errors[0];
    const message    = firstError
      ? `${firstError.path.join(".")}: ${firstError.message}`
      : "Invalid input.";
    return { success: false, error: message };
  }

  return { success: true, data: result.data };
}