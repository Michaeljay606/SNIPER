// Global type declarations for Deno in Supabase Edge Functions
// This allows the standard VS Code TypeScript compiler to recognize Deno APIs and HTTP imports.

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
}

declare module "https://deno.land/std/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; onError?: (err: unknown) => Response | Promise<Response> }
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js" {
  import { SupabaseClient } from "@supabase/supabase-js";
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient;
}

declare module "https://esm.sh/@supabase/supabase-js@2.103.3" {
  import { SupabaseClient } from "@supabase/supabase-js";
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient;
}
