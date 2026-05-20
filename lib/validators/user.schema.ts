// lib/validators/user.schema.ts

import { z } from "zod";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN   = 3;
const USERNAME_MAX   = 30;
const BIO_MAX        = 160;
const AVATAR_MAX_URL = 500;

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

export const UpdateProfileSchema = z.object({
  username: usernameSchema.optional(),
  bio:      bioSchema,
  avatar:   avatarSchema,
});

export const CreateProfileSchema = z.object({
  username: usernameSchema,
  bio:      bioSchema,
  avatar:   avatarSchema,
});

export const UsernameCheckSchema = z.object({
  username: usernameSchema,
});

export const SearchUsersSchema = z.object({
  q:      z.string().min(1).max(50).trim(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type UpdateProfileInput  = z.infer<typeof UpdateProfileSchema>;
export type CreateProfileInput  = z.infer<typeof CreateProfileSchema>;
export type UsernameCheckInput  = z.infer<typeof UsernameCheckSchema>;
export type SearchUsersInput    = z.infer<typeof SearchUsersSchema>;

export function validate<T>(
  schema: z.ZodSchema<T>,
  input:  unknown,
): { success: true; data: T; error?: never } | { success: false; error: string; data?: never } {
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