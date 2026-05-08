import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', 'mrtech237').single();
  console.log('--- TENANT DATA ---');
  console.log(tenant);

  const { data: appSettings } = await supabase.from('app_settings').select('*').eq('tenant_id', 'mrtech237');
  console.log('\n--- APP SETTINGS ---');
  console.log(appSettings);
}

checkData();
