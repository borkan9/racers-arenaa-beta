// app/api/explore/route.ts
//
// GET /api/explore                     → paginated list of all public racers
// GET /api/explore?q=karim             → search by username
// GET /api/explore?q=BMW               → search by any profile field
// GET /api/explore?limit=20&offset=0   → pagination
//
// Public endpoint — no auth required.
// Locked profiles appear in results but with masked data.

import { NextRequest, NextResponse }  from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validate, SearchUsersSchema } from "@/lib/validators/user.schema";
import type { UserRow }               from "@/types/database.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

// Fields returned to the public — never expose email or internal fields
type PublicUserProfile = {
  id:             string;
  username:       string | null;
  avatar:         string | null;
  bio:            string | null;
  role:           string | null;
};

type LockedUserProfile = {
  id:             string;
  username:       null;
  avatar:         null;
  bio:            null;
  locked:         true;
};

type ExploreEntry = PublicUserProfile | LockedUserProfile;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Masks a locked profile — id is preserved so the UI can
 * render a "Locked Profile" card without leaking any data.
 */
function maskLockedProfile(user: UserRow): LockedUserProfile {
  return {
    id:       user.id,
    username: null,
    avatar:   null,
    bio:      null,
    locked:   true,
  };
}

/**
 * Strips internal fields from a public profile.
 * Never return email, role internals, or created_at to public callers.
 */
function sanitisePublicProfile(user: UserRow): PublicUserProfile {
  return {
    id:       user.id,
    username: user.username,
    avatar:   user.avatar,
    bio:      user.bio,
    role:     (user as UserRow & { role?: string }).role ?? null,
  };
}

// ─── GET /api/explore ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // 1. Validate query params
  const raw = {
    q:      searchParams.get("q")      ?? "",
    limit:  searchParams.get("limit")  ?? 20,
    offset: searchParams.get("offset") ?? 0,
  };

  // Allow empty q — returns all racers when no search term given
  const isEmptyQuery = !raw.q || String(raw.q).trim().length === 0;

  let limit:  number;
  let offset: number;
  let q:      string;

  if (isEmptyQuery) {
    // Skip SearchUsersSchema (requires min 1 char) for browse-all mode
    limit  = Math.min(Number(raw.limit  ?? 20), 50);
    offset = Math.max(Number(raw.offset ?? 0),  0);
    q      = "";

    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json(
        { error: "limit and offset must be valid numbers." },
        { status: 400 },
      );
    }
  } else {
    const result = validate(SearchUsersSchema, raw);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }
    limit  = result.data.limit;
    offset = result.data.offset;
    q      = result.data.q;
  }

  // 2. Build query
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    // Exclude the test sentinel row
    .neq("username", "__supabase_connection_test__")
    .order("username", { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply search filter when query is present
  if (q.length > 0) {
    query = query.or(
      `username.ilike.%${q}%,bio.ilike.%${q}%`,
    );
  }

  // 3. Execute
  const { data, count, error } = await query;

  if (error) {
    console.error("[api/explore] Query error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch racers." },
      { status: 500 },
    );
  }

  // 4. Sanitise — mask locked profiles, strip internal fields from public ones
  const users = (data ?? []) as (UserRow & { profile_locked?: boolean })[];

  const entries: ExploreEntry[] = users.map((user) =>
    user.profile_locked
      ? maskLockedProfile(user)
      : sanitisePublicProfile(user),
  );

  return NextResponse.json(
    {
      users:  entries,
      count:  count  ?? 0,
      limit,
      offset,
      query:  q || null,
    },
    {
      status: 200,
      headers: {
        // Cache browse-all for 30s, search results for 10s
        "Cache-Control": q
          ? "public, s-maxage=10, stale-while-revalidate=5"
          : "public, s-maxage=30, stale-while-revalidate=15",
      },
    },
  );
}

// ─── METHOD GUARDS ────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405 },
  );
}