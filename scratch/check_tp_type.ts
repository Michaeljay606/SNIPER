import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTPType() {
  const { data, error } = await supabase.from('signals').select('tp').limit(5);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('TP values:', data.map(d => typeof d.tp + ': ' + d.tp));
}

checkTPType();
