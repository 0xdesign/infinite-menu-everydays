import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lykbbceawbrmtursljvk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixFilteredView() {
  console.log('🔧 Fixing nft_tokens_filtered view to only show the two allowed Zora collections...\n');

  // First, check current state
  const { count: currentCount } = await supabase
    .from('nft_tokens_filtered')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Current filtered view has ${currentCount} items`);
  
  if (currentCount === 706) {
    console.log('✅ View already appears to be correctly filtered (706 items)');
    return;
  }

  console.log('\n⚠️  View needs to be fixed. It should have 706 items from the two main collections.');
  console.log('\nTo apply the fix, you need to run this SQL in the Supabase dashboard:\n');
  
  const sql = `-- Fix the filtered view to only show the two allowed Zora collections
CREATE OR REPLACE VIEW public.nft_tokens_filtered AS
SELECT n.*
FROM public.nft_tokens n
WHERE n.collection_address IN (
  '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',  -- Ethereum mainnet collection (334 items)
  '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b'   -- Zora mainnet collection (372 items)
);`;

  console.log('```sql');
  console.log(sql);
  console.log('```\n');
  
  console.log('Steps:');
  console.log('1. Go to https://supabase.com/dashboard/project/lykbbceawbrmtursljvk/sql/new');
  console.log('2. Paste the SQL above');
  console.log('3. Click "Run"');
  console.log('\nThis will restore the original filtering to show only 706 items from the two main collections.');
}

fixFilteredView().catch(console.error);