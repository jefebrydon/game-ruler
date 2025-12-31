import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client with service role.
 * Has full access - only use in API routes, never expose to client.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    db: {
      schema: "public",
    },
    global: {
      fetch: (url, options = {}) => {
        // Add timeout to prevent hanging queries
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 10000); // 10 second timeout
        
        // Use existing signal if provided, otherwise use timeout signal
        const signal = options?.signal || controller.signal;
        
        return fetch(url, {
          ...options,
          signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    },
  });
}
