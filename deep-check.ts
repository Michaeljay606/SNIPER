import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeep(id: string) {
  const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', id).single();
  console.log('TENANT:', JSON.stringify(tenant, null, 2));
  
  const { data: settings } = await supabase.from('app_settings').select('*').eq('tenant_id', id);
  console.log('SETTINGS:', JSON.stringify(settings, null, 2));
}

checkDeep('6552467058');
checkDeep('mrtech237');
