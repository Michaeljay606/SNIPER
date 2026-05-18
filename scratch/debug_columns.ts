import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('signals').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  if (data && data[0]) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data found to check columns');
  }
}

checkColumns();
