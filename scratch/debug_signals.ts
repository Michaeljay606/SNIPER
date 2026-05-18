import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSignals() {
  const { data, error } = await supabase.from('signals').select('*');
  if (error) {
    console.error('Error fetching signals:', error);
    return;
  }

  console.log('--- SIGNALS IN DB ---');
  console.log('Total count:', data.length);
  data.forEach(s => {
    console.log(`- ID: ${s.id}, Tenant: ${s.tenant_id}, CreatedAt: ${s.created_at}, Mode: ${s.mode}, TradingMode: ${s.trading_mode}, Status: ${s.status}, Pair: ${s.pair}`);
  });
}

checkSignals();
