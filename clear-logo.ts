import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearLogo() {
  console.log('Clearing logo_url for tenant mrtech237...');
  const { data, error } = await supabase
    .from('tenants')
    .update({ logo_url: null })
    .eq('tenant_id', 'mrtech237')
    .select();

  if (error) {
    console.error('❌ Failed to clear logo:', error);
  } else {
    console.log('✅ Logo cleared successfully:', data);
  }
}

clearLogo();
