import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotifications() {
  console.log("Checking notifications table...");
  const { data, error } = await supabase.from('notifications').select('*').limit(1);
  if (error) {
    console.log("❌ notifications table error or does not exist:", error.message);
  } else {
    console.log("✅ notifications table exists! Sample data or keys:", data && data.length > 0 ? Object.keys(data[0]) : "Empty table");
  }

  console.log("Checking affiliates table columns...");
  const { data: aff, error: affErr } = await supabase.from('affiliates').select('*').limit(1);
  if (affErr) {
    console.log("❌ affiliates table error:", affErr.message);
  } else if (aff && aff.length > 0) {
    console.log("✅ affiliates columns:", Object.keys(aff[0]));
  }
}

checkNotifications();
