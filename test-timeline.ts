import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'content_mrtech237').single();
  console.log(JSON.stringify(data, null, 2));
}
test();
