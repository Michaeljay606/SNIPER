import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  // Test 1: Insert Signal
  console.log('\n--- Test 1: Insert Signal ---');
  const payload = {
    tenant_id: 'mrtech237',
    pair: 'TEST_PAIR',
    type: 'BUY',
    entry: '100',
    sl: '90',
    tp: '110',
    status: 'LIVE',
    is_vip: false
  };
  const { data: signalData, error: signalError } = await supabase.from('signals').insert([payload]).select();
  if (signalError) {
    console.error('❌ Insert Signal Failed:', signalError);
  } else {
    console.log('✅ Insert Signal Success:', signalData);
    
    // Clean up
    await supabase.from('signals').delete().eq('id', signalData[0].id);
  }

  // Test 2: Insert Academy Module
  console.log('\n--- Test 2: Insert Academy Module ---');
  const { data: moduleData, error: moduleError } = await supabase.from('academy_modules').insert([{
    tenant_id: 'mrtech237',
    title: 'Test Module',
    sort_order: 999
  }]).select();
  if (moduleError) {
    console.error('❌ Insert Module Failed:', moduleError);
  } else {
    console.log('✅ Insert Module Success:', moduleData);
    // Clean up
    await supabase.from('academy_modules').delete().eq('id', moduleData[0].id);
  }

  // Test 3: Storage Buckets Access
  console.log('\n--- Test 3: Storage Buckets Access ---');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ List Buckets Failed:', bucketsError);
  } else {
    console.log('✅ List Buckets Success:', buckets.map(b => b.name));
    if (!buckets.find(b => b.name === 'results')) console.error('⚠️ Missing bucket "results"');
    if (!buckets.find(b => b.name === 'profile')) console.error('⚠️ Missing bucket "profile"');
  }
}

testSupabase();
