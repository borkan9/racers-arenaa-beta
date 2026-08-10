// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminUserAction = "suspend" | "restore";

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

  if (action !== "suspend" && action !== "restore") {
    return NextResponse.json(
      { error: 'action must be either "suspend" or "restore".' },
      { status: 400 },
    );
  }

  if (user_id === guard.userId) {
    return NextResponse.json(
      { error: "Admins cannot suspend or restore their own account." },
      { status: 400 },
    );
  }

  const role = (action as AdminUserAction) === "suspend"
    ? "suspended"
    : "user";

  const { data: user, error } = await supabaseAdmin
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
