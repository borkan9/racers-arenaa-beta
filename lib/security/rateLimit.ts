import { supabaseAdmin } from "@/lib/supabase/admin";

type RawAdmin = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: boolean | null;
    error: { message?: string } | null;
  }>;
};

export async function consumeRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number,
): Promise<boolean> {
  const raw = supabaseAdmin as unknown as RawAdmin;
  const { data, error } = await raw.rpc("consume_api_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    console.error("[rateLimit] RPC error:", error.message);
    return true;
  }

  return data === true;
}
