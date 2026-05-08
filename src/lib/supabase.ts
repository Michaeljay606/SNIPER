import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean the URL to prevent "Failed to fetch" from malformed strings
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
  // Force https if missing (common copy-paste error)
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create the client, providing a fake URL/Key if missing just to prevent hard null crashes,
// then operations will naturally fail with "Failed to fetch" or invalid URL, which is handled gracefully.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Realtime helpers - guard against null supabase
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  if (!supabase) {
    console.warn('Supabase is not configured. Subscription skipped.');
    return { unsubscribe: () => {} };
  }
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
