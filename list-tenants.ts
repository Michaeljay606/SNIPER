import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('tenant_id, mentor_name, plan, onboarding_completed, onboarding_step')
    .order('onboarding_completed', { ascending: false });
  
  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

listTenants();
