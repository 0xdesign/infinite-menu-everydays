import { supabase } from './lib/supabase';

async function testInspire() {
  console.log('🔍 Testing search for "inspire" - looking for motivational/aspirational content\n');
  
  const { data, error } = await supabase
    .rpc('rpc_search_nfts_enhanced', { q: 'inspire', cats: null });
  
  if (!error && data) {
    console.log(`Found ${data.length} results\n`);
    
    if (data.length === 0) {
      console.log('No results found - this suggests "inspire" might not appear literally in the content.');
      console.log('This is a limitation of the current search - it needs exact or fuzzy text matches.\n');
    } else {
      data.slice(0, 5).forEach((item: any, i: number) => {
        console.log(`${i+1}. [ID: ${item.id}] ${item.title}`);
        console.log(`   ${item.description?.substring(0, 150)}...`);
        console.log('');
      });
    }
  } else if (error) {
    console.error('Search error:', error);
  }
}

testInspire().then(() => process.exit(0));