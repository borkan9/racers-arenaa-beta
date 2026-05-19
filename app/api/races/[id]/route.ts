// app/api/races/[id]/route.ts
//
// GET    /api/races/[id]   → fetch a single race by id
// DELETE /api/races/[id]   → admin-only hard delete of a race record
//
// GET is semi-public:
//   - Owner can always fetch their own race (public or private)
//   - Non-owners can only fetch public, non-removed races
//   - Unauthenticated users can fetch public, non-removed races
//
// DELETE is admin-only.
// Uses requireAdmin() — non-admins receive 403.

import { NextRequest, NextResponse }  from "next/server";
import { getSession }                  from "@/lib/auth/getSession";
import { requireAdmin }                from "@/lib/auth/requireAuth";
import { getRaceById, updateRace }     from "@/lib/db/races";
import { z }                           from "zod";

// ─── PARAM SCHEMA ─────────────────────────────────────────────────────────────

const UuidSchema = z.string().uuid("Invalid race ID format.");

// ─── GET /api/races/[id] ──────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // 1. Validate id param
  const parsed = UuidSchema.safeParse(params.id);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid race ID." },
      { status: 400 },
    );
  }

  const raceId = parsed.data;

  // 2. Fetch race
  const { data: race, error } = await getRaceById(raceId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch race." },
      { status: 500 },
    );
  }

  if (!race) {
    return NextResponse.json(
      { error: "Race not found." },
      { status: 404 },
    );
  }

  // 3. Access control
  // Removed races are invisible to everyone except admins
  if (race.status === "REMOVED") {
    // Check if requester is admin — if not, return 404 (not 403, to avoid leaking existence)
    const { user } = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Race not found." }, { status: 404 });
    }

    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase  = createSupabaseServerClient();
    const { data }  = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (data as { role?: string } | null)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Race not found." }, { status: 404 });
    }
  }

  // 4. Private race — only owner can view
  if (race.is_private) {
    const { user } = await getSession();
    if (!user || user.id !== race.user_id) {
      return NextResponse.json(
        { error: "This run is private." },
        { status: 403 },
      );
    }
  }

  // 5. Sanitise route_points for non-owners
  // Strip GPS coordinates from other people's races for privacy
  const { user } = await getSession();
  const isOwner  = user?.id === race.user_id;

  const sanitised = isOwner
    ? race
    : {
        ...race,
        // Mask exact GPS start/finish for non-owners
        start_lat:    race.start_lat    !== null ? Number(race.start_lat.toFixed(2))  : null,
        start_lng:    race.start_lng    !== null ? Number(race.start_lng.toFixed(2))  : null,
        finish_lat:   race.finish_lat   !== null ? Number(race.finish_lat.toFixed(2)) : null,
        finish_lng:   race.finish_lng   !== null ? Number(race.finish_lng.toFixed(2)) : null,
        // Strip full route point array — only owner gets the replay data
        route_points: null,
      };

  return NextResponse.json(
    { race: sanitised },
    {
      status: 200,
      headers: {
        // Short cache — race status can change (flagged → approved)
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}

// ─── DELETE /api/races/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // 1. Admin guard
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // 2. Validate id param
  const parsed = UuidSchema.safeParse(params.id);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid race ID." },
      { status: 400 },
    );
  }

  const raceId = parsed.data;

  // 3. Verify race exists before attempting delete
  const { data: existing, error: fetchError } = await getRaceById(raceId);

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch race." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Race not found." },
      { status: 404 },
    );
  }

  // 4. Soft delete — set status to REMOVED rather than hard deleting
  // Preserves the audit trail and prevents leaderboard orphan entries
  const { data: removed, error: removeError } = await updateRace(raceId, {
    status:      "REMOVED",
    reviewed:    true,
    flag_reason: `Deleted by admin ${guard.userId}`,
  });

  if (removeError || !removed) {
    return NextResponse.json(
      { error: "Failed to delete race." },
      { status: 500 },
    );
  }

  console.log(
    `[api/races/${raceId}] Soft-deleted by admin ${guard.userId}.`,
  );

  return NextResponse.json(
    {
      message: `Race ${raceId} has been removed.`,
      race:    removed,
    },
    { status: 200 },
  );
}

// ─── METHOD GUARDS ────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}