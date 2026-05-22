import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tenantId = '12243443';
  console.log('Querying tenants for tenantId:', tenantId);
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  if (tenantError) {
    console.error('Tenants Error:', tenantError);
  } else {
    console.log('Tenants Data (keys):', Object.keys(tenantData));
  }

  console.log('\nQuerying tenants_config for tenantId:', tenantId);
  const { data: configData, error: configError } = await supabase
    .from('tenants_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  if (configError) {
    console.error('TenantsConfig Error:', configError);
  } else {
    console.log('TenantsConfig Data (keys):', Object.keys(configData));
    console.log('TenantsConfig Row:', configData);
  }
}
run();
