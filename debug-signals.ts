import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('--- DEBUG SIGNALS ---');
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching signals:', error);
  } else {
    console.log('Last 5 signals:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  const { data: tenants } = await supabase.from('tenants').select('tenant_id').limit(5);
  console.log('Tenants in DB:', tenants?.map(t => t.tenant_id));
}

debug();
