import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const payload = {
    pair: 'EURUSD',
    type: 'live',
    mode: 'forex',
    entry: '1.1000',
    sl: '1.0900',
    tp: '1.1200',
    status: 'active',
    tenant_id: 'default'
  };
  console.log("Trying to insert signal...");
  const { data, error } = await supabase.from('signals').insert(payload).select();
  console.log('Signal Insert Error:', error);
  if (data) {
    console.log('Signal Inserted:', data);
    await supabase.from('signals').delete().eq('id', data[0].id);
  }
}
check();
