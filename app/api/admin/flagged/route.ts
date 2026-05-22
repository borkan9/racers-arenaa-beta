// app/api/admin/flagged/route.ts

import { NextRequest, NextResponse }                from "next/server";
import { requireAdmin }                              from "@/lib/auth/requireAuth";
import { getFlaggedRaces, approveRace, removeRace } from "@/lib/db/races";
import { validate, AdminRaceActionSchema }           from "@/lib/validators/race.schema";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(Number(searchParams.get("limit")  ?? 50), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0),  0);

  if (isNaN(limit) || isNaN(offset)) {
    return NextResponse.json(
      { error: "limit and offset must be valid numbers." },
      { status: 400 },
    );
  }

  const { data: races, count, error } = await getFlaggedRaces(limit, offset);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch flagged races." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { races: races ?? [], count: count ?? 0, limit, offset },
    { status: 200 },
  );
}

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

  const result = validate(AdminRaceActionSchema, body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 },
    );
  }

  const { race_id, action, note } = result.data;

  if (action === "approve") {
    const { data: race, error } = await approveRace(race_id, note);

    if (error || !race) {
      return NextResponse.json(
        { error: "Failed to approve race." },
        { status: 500 },
      );
    }

    console.log(
      `[admin/flagged] Race ${race_id} approved by admin ${guard.userId}. Note: ${note}`,
    );

    return NextResponse.json(
      { race, message: `Race ${race_id} approved and restored to FINISHED status.` },
      { status: 200 },
    );
  }

  if (action === "remove") {
    const { data: race, error } = await removeRace(race_id, note);

    if (error || !race) {
      return NextResponse.json(
        { error: "Failed to remove race." },
        { status: 500 },
      );
    }

    console.log(
      `[admin/flagged] Race ${race_id} removed by admin ${guard.userId}. Note: ${note}`,
    );

    return NextResponse.json(
      { race, message: `Race ${race_id} removed from all public views.` },
      { status: 200 },
    );
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}