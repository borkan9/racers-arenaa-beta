// app/api/races/[id]/route.ts

import { NextRequest, NextResponse }  from "next/server";
import { getSession }                  from "@/lib/auth/getSession";
import { requireAdmin }                from "@/lib/auth/requireAuth";
import { getRaceById, updateRace }     from "@/lib/db/races";
import { z }                           from "zod";

const UuidSchema = z.string().uuid("Invalid race ID format.");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid race ID." }, { status: 400 });
  }

  const raceId = parsed.data;

  const { data: race, error } = await getRaceById(raceId);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch race." }, { status: 500 });
  }

  if (!race) {
    return NextResponse.json({ error: "Race not found." }, { status: 404 });
  }

  if (race.status === "REMOVED") {
    const { user } = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Race not found." }, { status: 404 });
    }

    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase  = await createSupabaseServerClient();
    const rawClient = supabase as unknown as { from: (t: string) => any };
    const { data }  = await rawClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (data as { role?: string } | null)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Race not found." }, { status: 404 });
    }
  }

  if (race.is_private) {
    const { user } = await getSession();
    if (!user || user.id !== race.user_id) {
      return NextResponse.json(
        { error: "This run is private." },
        { status: 403 },
      );
    }
  }

  const { user } = await getSession();
  const isOwner  = user?.id === race.user_id;

  const sanitised = isOwner
    ? race
    : {
        ...race,
        start_lat:    race.start_lat    !== null ? Number(race.start_lat.toFixed(2))   : null,
        start_lng:    race.start_lng    !== null ? Number(race.start_lng.toFixed(2))   : null,
        finish_lat:   race.finish_lat   !== null ? Number(race.finish_lat.toFixed(2))  : null,
        finish_lng:   race.finish_lng   !== null ? Number(race.finish_lng.toFixed(2))  : null,
        route_points: null,
      };

  return NextResponse.json(
    { race: sanitised },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid race ID." }, { status: 400 });
  }

  const raceId = parsed.data;

  const { data: existing, error: fetchError } = await getRaceById(raceId);

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch race." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Race not found." }, { status: 404 });
  }

  const { data: removed, error: removeError } = await updateRace(raceId, {
    status:      "REMOVED",
    reviewed:    true,
    flag_reason: `Deleted by admin ${guard.userId}`,
  });

  if (removeError || !removed) {
    return NextResponse.json({ error: "Failed to delete race." }, { status: 500 });
  }

  console.log(`[api/races/${raceId}] Soft-deleted by admin ${guard.userId}.`);

  return NextResponse.json(
    { message: `Race ${raceId} has been removed.`, race: removed },
    { status: 200 },
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}