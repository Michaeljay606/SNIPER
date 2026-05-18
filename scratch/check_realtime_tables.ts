import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtime() {
  console.log('Checking tables in supabase_realtime publication...');
  // We can query pg_catalog or check pg_publication_tables if RLS/grants allow, 
  // or we can test if we can subscribe to changes on the signals table.
  const { data, error } = await supabase
    .from('pg_publication_tables')
    .select('*')
    .eq('pubname', 'supabase_realtime');
    
  if (error) {
    console.error('Error querying pg_publication_tables:', error.message);
    console.log('This is expected if select on pg_publication_tables is not granted to anon/authenticated.');
  } else {
    console.log('Tables in supabase_realtime:', data.map(t => t.tablename));
  }
}

checkRealtime();
