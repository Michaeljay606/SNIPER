import { supabase } from './src/lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase.from('signals').select('*').limit(1);
  if (error) {
    console.error("Error fetching signals:", error);
  } else if (data && data.length > 0) {
    console.log("Columns in 'signals' table:", Object.keys(data[0]));
  } else {
    console.log("No signals found in table to inspect columns.");
  }
}

checkSchema();
