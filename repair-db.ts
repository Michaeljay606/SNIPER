import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function repairDB() {
  console.log('Tentative de réparation des Buckets Storage...');
  
  // 1. Créer les buckets
  const b1 = await supabase.storage.createBucket('results', { public: true });
  console.log('Bucket "results":', b1.error ? b1.error.message : 'Créé');
  
  const b2 = await supabase.storage.createBucket('profile', { public: true });
  console.log('Bucket "profile":', b2.error ? b2.error.message : 'Créé');

  // Test insert Signal avec des nombres (comme dans l'app)
  console.log('\nTest Insert Signal avec numbers...');
  const payload = {
    tenant_id: 'mrtech237',
    pair: 'TEST_NUMBERS',
    type: 'SELL',
    entry: 2000.50,
    sl: 2010.00,
    tp: '1990 | 1980',
    status: 'LIVE',
    is_vip: false
  };
  const { data, error } = await supabase.from('signals').insert([payload]).select();
  if (error) {
    console.error('❌ Insert Signal Failed:', error);
  } else {
    console.log('✅ Insert Signal avec numbers a fonctionné !', data[0].id);
    await supabase.from('signals').delete().eq('id', data[0].id);
  }
}

repairDB();
