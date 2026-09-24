// `server-only` makes this module fail at BUILD TIME if any Client Component
// imports it. This is the hard guarantee that the service-role key never
// reaches a browser bundle (the SSR/publishable clients live in ./client.ts
// and ./server.ts and must not be mixed with this one).
import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client (service-role / secret key): bypasses RLS.
 *
 * STRICT RULES:
 * - Server-only: Server Actions and Route Handlers exclusively (guarded by
 *   the `server-only` import above).
 * - Never pass this client (or its result) to any Client Component or prop.
 * - Never use it for auth checks: identity comes from the SSR client via
 *   `auth.getClaims()`; this client exists to perform validated writes that
 *   anonymous RLS forbids (e.g. creating orders in Phase 4).
 * - RLS stays enabled and deny-by-default; this client is the deliberate,
 *   narrow exception, not the normal data path.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or " +
        "SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
