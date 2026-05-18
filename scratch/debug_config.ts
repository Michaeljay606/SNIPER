import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDefaultConfig() {
  const { data, error } = await supabase.from('tenants').select('*').eq('tenant_id', 'default').single();
  if (error) {
    console.error('Error fetching config:', error);
    return;
  }

  console.log('--- DEFAULT TENANT CONFIG ---');
  console.log('Trading Mode:', data.trading_mode);
  console.log('Mentor Name:', data.mentor_name);
}

checkDefaultConfig();
