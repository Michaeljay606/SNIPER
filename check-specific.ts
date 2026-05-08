import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificTenant(id: string) {
  console.log(`Checking data for tenant: ${id}`);
  
  const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', id).single();
  console.log('--- TENANT ---');
  console.log(tenant);

  const { data: settings } = await supabase.from('app_settings').select('*').eq('tenant_id', id);
  console.log('\n--- APP SETTINGS ---');
  console.log(settings);
}

checkSpecificTenant('6552467058');
