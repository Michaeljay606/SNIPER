import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  // We can't run ALTER TABLE via the JS client unless there is a custom RPC.
  // Instead, let's fix the frontend code to map 'forex' -> 'MARKETS', 'binary' -> 'BINARY', 'both' -> 'BOTH'
  // and hope 'BOTH' is in the allowed values. 
  // Wait, the error said it violates the constraint.
  
  // Let's check the current value of trading_mode in the DB.
  const { data, error } = await supabase.from('tenants').select('trading_mode').limit(1);
  console.log('Current trading_mode in DB:', data?.[0]?.trading_mode);
}

run();
