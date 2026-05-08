import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('Cleaning up tenants...');
  const { error } = await supabase
    .from('tenants')
    .update({ 
      logo_url: null, 
      onboarding_completed: false, 
      onboarding_step: 1 
    })
    .in('tenant_id', ['mrtech237', '6552467058']);
  
  if (error) console.error(error);
  else console.log('✅ Cleanup success');
}

cleanup();
