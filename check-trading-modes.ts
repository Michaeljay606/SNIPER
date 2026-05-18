import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTradingModes() {
  const { data, error } = await supabase
    .from('tenants')
    .select('tenant_id, mentor_name, trading_mode')
    .order('tenant_id');

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  console.log('--- TENANTS TRADING MODES ---');
  console.log(JSON.stringify(data, null, 2));
}

checkTradingModes();
