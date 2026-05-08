import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  console.log('Testing app_settings upsert...');
  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      key: 'test_key_logic', 
      tenant_id: 'mrtech237', 
      value: { test: true } 
    }, { onConflict: 'key' });
  
  if (error) {
    console.error('❌ Upsert failed:', error);
  } else {
    console.log('✅ Upsert success');
  }
}

testUpsert();
