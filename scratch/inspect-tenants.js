import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kqfbdkqkcyccgoiakooy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZmJka3FrY3ljY2dvaWFrb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDYxNDcsImV4cCI6MjA5MTk4MjE0N30.kkaCbutINeNk-oo8YnRKjk1ie9uYBECN8bsSvtpa9OI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching columns from tenants...');
  const { data, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data[0]) {
    console.log('COLUMNS:', Object.keys(data[0]));
    console.log('FIRST_ROW:', data[0]);
  } else {
    console.log('No tenants found.');
  }
}
run();
