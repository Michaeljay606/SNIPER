import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSignals() {
  const { data, error } = await supabase.from('signals').select('*').limit(1);
  if (error) {
    console.error("Error fetching signals:", error);
  } else if (data && data[0]) {
    console.log("Signal columns:", Object.keys(data[0]));
  }
  
  const { data: tenants } = await supabase.from('tenants').select('*').limit(1);
  if (tenants && tenants[0]) {
     console.log("Tenant columns:", Object.keys(tenants[0]));
  }

  const { data: settings } = await supabase.from('app_settings').select('*').limit(5);
  console.log("App Settings keys:", settings?.map(s => s.key));
}

checkSignals();
