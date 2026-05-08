import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetTenant(id: string) {
  console.log(`Resetting onboarding for: ${id}`);
  const { error } = await supabase
    .from('tenants')
    .update({ 
      onboarding_completed: false, 
      onboarding_step: 1 
    })
    .eq('tenant_id', id);
  
  if (error) console.error(error);
  else console.log('Reset success');
}

resetTenant('6552467058');
resetTenant('mrtech237');
