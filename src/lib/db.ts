import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Because it bypasses RLS,
// every route must check the logged-in user itself (see getUser in auth.ts).
// Next.js 14 caches fetch() GET requests by default, and supabase-js reads data with GET,
// so without "no-store" admin changes (odds, fusion chances) could keep showing old values.
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
});
