// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserAction =
  | "suspend"
  | "restore"
  | "verify"
  | "reject_verification";

type RawClient = {
  from: (table: string) => any;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const { user_id, action } = body as {
    user_id?: unknown;
    action?: unknown;
  };

  if (typeof user_id !== "string" || user_id.trim().length === 0) {
    return NextResponse.json(
      { error: "user_id must be a non-empty string." },
      { status: 400 },
    );
  }

  if (
    action !== "suspend"
    && action !== "restore"
    && action !== "verify"
    && action !== "reject_verification"
  ) {
    return NextResponse.json(
      {
        error: "action must be one of: suspend, restore, verify, reject_verification.",
      },
      { status: 400 },
    );
  }

  if (user_id === guard.userId) {
    return NextResponse.json(
      { error: "Admins cannot suspend or restore their own account." },
      { status: 400 },
    );
  }

  const adminAction = action as AdminUserAction;
  const role = adminAction === "suspend"
    ? "suspended"
    : adminAction === "verify"
      ? "verified"
      : "user";

  const raw = supabaseAdmin as unknown as RawClient;

  const { data: user, error } = await raw
    .from("users")
    .update({ role })
    .eq("id", user_id)
    .select()
    .single();

  if (error || !user) {
    console.error("[admin/users] Failed to update user role:", error?.message);
    return NextResponse.json(
      { error: "Failed to update user role." },
      { status: 500 },
    );
  }

  return NextResponse.json({ user }, { status: 200 });
}
