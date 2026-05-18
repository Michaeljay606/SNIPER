const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://kqfbdkqkcyccgoiakooy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZmJka3FrY3ljY2dvaWFrb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDYxNDcsImV4cCI6MjA5MTk4MjE0N30.kkaCbutINeNk-oo8YnRKjk1ie9uYBECN8bsSvtpa9OI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const { data, error } = await supabase.from('signals').select('*').limit(3);
  console.log('SIGNALS_DATA:', JSON.stringify(data));
  console.log('SIGNALS_ERROR:', error);
}
debug();
