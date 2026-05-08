import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSave() {
  const tenantId = '6552467058';
  console.log(`Testing save for tenant: ${tenantId}`);
  
  const newValue = { profile: 'https://test-photo.url' };
  const { error } = await supabase
    .from('app_settings')
    .upsert({ 
      key: `profile_${tenantId}`, 
      tenant_id: tenantId, 
      value: newValue 
    }, { onConflict: 'tenant_id,key' });
  
  if (error) {
    console.error('❌ Save failed:', error);
  } else {
    console.log('✅ Save success');
  }
}

testSave();
