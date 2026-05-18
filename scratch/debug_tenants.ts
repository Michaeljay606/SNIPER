import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
  const { data, error } = await supabase.from('tenants').select('tenant_id, mentor_name');
  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  console.log('--- TENANTS IN DB ---');
  data.forEach(t => {
    console.log(`- ID: ${t.tenant_id}, Name: ${t.mentor_name}`);
  });
}

checkTenants();
