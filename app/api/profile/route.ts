// app/api/profile/route.ts
//
// GET  /api/profile        → fetch the authenticated user's profile
// PATCH /api/profile       → update the authenticated user's profile
//
// All routes are protected — requireAuth() guard runs first.
// Input is validated with Zod before any database call.

import { NextRequest, NextResponse }    from "next/server";
import { requireAuth }                  from "@/lib/auth/requireAuth";
import { getUserById, updateUser, isUsernameAvailable } from "@/lib/db/users";
import { validate, UpdateProfileSchema } from "@/lib/validators/user.schema";

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  // 2. Fetch profile
  const { data: user, error } = await getUserById(guard.userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile." },
      { status: 500 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ user }, { status: 200 });
}

// ─── PATCH /api/profile ───────────────────────────────────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // 3. Validate input
  const result = validate(UpdateProfileSchema, body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 },
    );
  }

  const { username, bio, avatar } = result.data;

  // 4. Username availability check (only if username is being changed)
  if (username !== undefined) {
    const available = await isUsernameAvailable(username, guard.userId);
    if (!available) {
      return NextResponse.json(
        { error: "username: This username is already taken." },
        { status: 409 },
      );
    }
  }

  // 5. Build update payload — only include fields that were provided
  const payload: Record<string, unknown> = {};
  if (username !== undefined) payload.username = username;
  if (bio      !== undefined) payload.bio      = bio;
  if (avatar   !== undefined) payload.avatar   = avatar;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update." },
      { status: 400 },
    );
  }

  // 6. Update database
  const { data: updated, error: updateError } = await updateUser(
    guard.userId,
    payload,
  );

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ user: updated }, { status: 200 });
}

// ─── METHOD GUARDS ────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Use PATCH to update your profile." },
    { status: 405 },
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Contact support to delete your account." },
    { status: 405 },
  );
}