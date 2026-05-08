import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAffiliates() {
  const { data } = await supabase
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
}

checkAffiliates();
