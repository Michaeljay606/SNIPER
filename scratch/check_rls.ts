import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'signals' });
  if (error) {
    // If RPC doesn't exist, try manual query
    const { data: data2, error: error2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'signals');
    if (error2) {
      console.error('Error fetching policies:', error2);
      return;
    }
    console.log('--- POLICIES ON SIGNALS ---');
    console.log(data2);
  } else {
    console.log('--- POLICIES ON SIGNALS ---');
    console.log(data);
  }
}

// Check if RLS is enabled
async function checkRLS() {
  const { data, error } = await supabase.rpc('check_rls', { table_name: 'signals' });
  // Since we can't easily run RPCs we haven't defined, let's just try to fetch as a non-admin if we can
  // But we only have the anon key.
  
  console.log('Fetching signals with anon key...');
  const { data: signals, error: err } = await supabase.from('signals').select('id');
  if (err) {
    console.log('Fetch failed:', err.message);
  } else {
    console.log('Fetch successful, count:', signals.length);
  }
}

checkRLS();
