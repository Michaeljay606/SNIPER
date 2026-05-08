import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIds() {
  const { data } = await supabase.from('tenants').select('tenant_id, telegram_id, mentor_name');
  console.log(JSON.stringify(data, null, 2));
}

checkIds();
