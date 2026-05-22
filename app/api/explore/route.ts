// app/api/explore/route.ts

import { NextRequest, NextResponse }  from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validate, SearchUsersSchema } from "@/lib/validators/user.schema";

type PublicUserProfile = {
  id:       string;
  username: string | null;
  avatar:   string | null;
  bio:      string | null;
  role:     string | null;
};

type LockedUserProfile = {
  id:       string;
  username: null;
  avatar:   null;
  bio:      null;
  locked:   true;
};

type ExploreEntry = PublicUserProfile | LockedUserProfile;

type RawUser = {
  id:              string;
  username:        string | null;
  avatar:          string | null;
  bio:             string | null;
  role?:           string;
  profile_locked?: boolean;
};

function maskLockedProfile(user: RawUser): LockedUserProfile {
  return { id: user.id, username: null, avatar: null, bio: null, locked: true };
}

function sanitisePublicProfile(user: RawUser): PublicUserProfile {
  return {
    id:       user.id,
    username: user.username,
    avatar:   user.avatar,
    bio:      user.bio,
    role:     user.role ?? null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const raw = {
    q:      searchParams.get("q")      ?? "",
    limit:  searchParams.get("limit")  ?? 20,
    offset: searchParams.get("offset") ?? 0,
  };

  const isEmptyQuery = !raw.q || String(raw.q).trim().length === 0;

  let limit:  number;
  let offset: number;
  let q:      string;

  if (isEmptyQuery) {
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

  // Await the async client
  const supabase  = await createSupabaseServerClient();
  const rawClient = supabase as unknown as { from: (table: string) => any };

  let query = rawClient
    .from("users")
    .select("*", { count: "exact" })
    .neq("username", "__supabase_connection_test__")
    .order("username", { ascending: true })
    .range(offset, offset + limit - 1);

  if (q.length > 0) {
    query = query.or(`username.ilike.%${q}%,bio.ilike.%${q}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[api/explore] Query error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch racers." },
      { status: 500 },
    );
  }

  const users = (data ?? []) as RawUser[];

  const entries: ExploreEntry[] = users.map((user) =>
    user.profile_locked
      ? maskLockedProfile(user)
      : sanitisePublicProfile(user),
  );

  return NextResponse.json(
    { users: entries, count: count ?? 0, limit, offset, query: q || null },
    {
      status: 200,
      headers: {
        "Cache-Control": q
          ? "public, s-maxage=10, stale-while-revalidate=5"
          : "public, s-maxage=30, stale-while-revalidate=15",
      },
    },
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}