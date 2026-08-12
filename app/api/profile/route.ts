// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { isUsernameAvailable } from "@/lib/db/users";
import { validate, UpdateProfileSchema } from "@/lib/validators/user.schema";
import { supabaseAdmin } from "@/lib/supabase/admin";

const raw = supabaseAdmin as unknown as { from: (table: string) => any };

export async function GET(): Promise<NextResponse> {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  try {
    const { data, error } = await raw
      .from("users")
      .select("*")
      .eq("id", guard.userId)
      .maybeSingle();

    if (error) {
      console.error("[api/profile] GET error:", error.message);
      return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch (err) {
    console.error("[api/profile] Unexpected error:", err);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validate(UpdateProfileSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { username, bio, avatar } = result.data;

  if (username !== undefined) {
    const available = await isUsernameAvailable(username, guard.userId);
    if (!available) {
      return NextResponse.json({ error: "username: This username is already taken." }, { status: 409 });
    }
  }

  const payload: Record<string, unknown> = {};
  if (username !== undefined) payload.username = username;
  if (bio !== undefined) payload.bio = bio;
  if (avatar !== undefined) payload.avatar = avatar;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
  }

  try {
    const { data, error } = await raw
      .from("users")
      .update(payload)
      .eq("id", guard.userId)
      .select()
      .single();

    if (error) {
      const message = String(error.message ?? "");
      if (message.toLowerCase().includes("users_username_lower_unique_idx") || message.toLowerCase().includes("duplicate key")) {
        return NextResponse.json({ error: "username: This username is already taken." }, { status: 409 });
      }
      console.error("[api/profile] PATCH error:", error.message);
      return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch (err) {
    console.error("[api/profile] Unexpected PATCH error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
