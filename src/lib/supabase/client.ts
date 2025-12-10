import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client-side Supabase client.
 * Uses the anon key (public) - safe for browser use.
 * Only use for public read operations.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  // For public reads, we use the URL directly without auth
  // The storage bucket is public, so this works for fetching PDFs
  return createClient<Database>(supabaseUrl, "public-anon-placeholder", {
    auth: { persistSession: false },
  });
}
