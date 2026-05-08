import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const tenantId = 'mrtech237';
  console.log('Testing tenant update...');
  const { data, error } = await supabase
    .from('tenants')
    .update({
      onboarding_step: 1,
      wallets: { ton: '', usdtTrc20: '' },
      signals_duration_model: 'monthly',
      academy_duration_model: 'lifetime',
      vip_model: 'payment',
      academy_model: 'broker',
      mentor_name: 'Test Name',
      social_telegram: 'test',
      whatsapp_url: 'test'
    })
    .eq('tenant_id', tenantId)
    .select();

  if (error) {
    console.error('❌ Update failed:', error);
  } else {
    console.log('✅ Update success:', data);
  }
}

testUpdate();
