import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error(error);
    return;
  }
  console.log('Notifications in Database:');
  console.log(JSON.stringify(data, null, 2));
}

checkNotifications();
