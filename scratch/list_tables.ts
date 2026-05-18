import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // Try a different way if RPC fails
    const { data: data2, error: error2 } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
    if (error2) {
      console.error('Error:', error2);
      return;
    }
    console.log('Tables:', data2.map(t => t.tablename));
  } else {
    console.log('Tables:', data);
  }
}

listTables();
