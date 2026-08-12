// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

type AdminUserAction =
  | "suspend"
  | "restore"
  | "verify"
  | "reject_verification";

type RawClient = {
  from: (table: string) => any;
};

const AdminUsersQuerySchema = z.object({
  role: z.enum(["user", "admin", "suspended", "verified", "pending_verification"]).optional(),
  q: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const allowed = await consumeRateLimit(`admin-users-read:${guard.userId}`, 60, 120);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many admin requests. Please retry shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = AdminUsersQuerySchema.safeParse({
    role: searchParams.get("role") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ?? 200,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid admin user query." }, { status: 400 });
  }

  const raw = supabaseAdmin as unknown as RawClient;
  let query = raw
    .from("users")
    .select("id, username, avatar, role")
    .order("username", { ascending: true })
    .limit(parsed.data.limit);

  if (parsed.data.role) query = query.eq("role", parsed.data.role);
  if (parsed.data.q) query = query.ilike("username", `%${parsed.data.q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/users] Failed to list users:", error.message);
    return NextResponse.json({ error: "Failed to list users." }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const allowed = await consumeRateLimit(`admin-users-write:${guard.userId}`, 60, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many admin actions. Please retry shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { user_id, action } = body as { user_id?: unknown; action?: unknown };

  if (typeof user_id !== "string" || user_id.trim().length === 0) {
    return NextResponse.json({ error: "user_id must be a non-empty string." }, { status: 400 });
  }

  if (
    action !== "suspend" &&
    action !== "restore" &&
    action !== "verify" &&
    action !== "reject_verification"
  ) {
    return NextResponse.json(
      { error: "action must be one of: suspend, restore, verify, reject_verification." },
      { status: 400 },
    );
  }

  if (user_id === guard.userId) {
    return NextResponse.json(
      { error: "Admins cannot change their own account role from this endpoint." },
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
    .select("id, username, avatar, role")
    .single();

  if (error || !user) {
    console.error("[admin/users] Failed to update user role:", error?.message);
    return NextResponse.json({ error: "Failed to update user role." }, { status: 500 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
