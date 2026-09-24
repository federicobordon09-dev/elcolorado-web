import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Request-scoped: create a NEW client on every request (it reconfigures
 * fetch around the current request's cookies).
 *
 * Uses only the public (publishable/anon) key — never the service-role key.
 * Auth checks must use `supabase.auth.getClaims()` (verifies the token),
 * never `getSession()` alone (reads unverified cookie contents).
 *
 * Cookie writes: Server Components cannot set outgoing cookies; the try/catch
 * below is the official pattern. The Next 16 `proxy.ts` (added in Phase 5,
 * when staff auth exists) owns refreshing tokens and writing cookies/headers
 * on every request.
 */
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component: cannot set cookies here.
          // The Phase 5 proxy performs the actual write.
        }
      },
    },
  });
}
