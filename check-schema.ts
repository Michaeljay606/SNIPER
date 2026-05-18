import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- CHECKING TENANTS ---');
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .limit(1);
  
  if (tenantError) {
    console.error('Error fetching tenants:', tenantError);
  } else if (tenantData && tenantData.length > 0) {
    console.log('Tenants columns:', Object.keys(tenantData[0]));
  } else {
    console.log('No tenants found to check columns.');
  }

  console.log('\n--- CHECKING AFFILIATES ---');
  const { data: affiliateData, error: affiliateError } = await supabase
    .from('affiliates')
    .select('*')
    .limit(1);
  
  if (affiliateError) {
    console.error('Error fetching affiliates:', affiliateError);
  } else if (affiliateData && affiliateData.length > 0) {
    console.log('Affiliates columns:', Object.keys(affiliateData[0]));
  } else {
    console.log('No affiliates found.');
  }

  console.log('\n--- CHECKING MEMBERS ---');
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .limit(1);
  
  if (memberError) {
    console.error('Error fetching members:', memberError);
  } else if (memberData && memberData.length > 0) {
    console.log('Members columns:', Object.keys(memberData[0]));
  } else {
    console.log('No members found.');
  }
}

checkSchema();
