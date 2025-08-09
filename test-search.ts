import { supabase } from './lib/supabase';

async function testSearch(query: string) {
  console.log(`\n🔍 Testing search for: "${query}"\n`);
  
  try {
    // Try enhanced search first
    const { data: enhancedData, error: enhancedError } = await supabase
      .rpc('rpc_search_nfts_enhanced', { q: query, cats: null });

    if (!enhancedError && enhancedData) {
      console.log(`✅ Enhanced search returned ${enhancedData.length} results\n`);
      
      // Show first 5 results
      enhancedData.slice(0, 5).forEach((item: any, index: number) => {
        console.log(`${index + 1}. [ID: ${item.id}] ${item.title}`);
        console.log(`   ${item.description?.substring(0, 150)}${item.description?.length > 150 ? '...' : ''}`);
        if (item.category?.length > 0) {
          console.log(`   Categories: ${item.category.join(', ')}`);
        }
        console.log('');
      });
      
      return enhancedData;
    }

    // Fall back to regular search
    console.log('Enhanced search not available, trying regular search...');
    const { data, error } = await supabase
      .rpc('rpc_search_nfts', { q: query, cats: null });

    if (error) {
      console.error('❌ Search error:', error);
      return [];
    }

    console.log(`Regular search returned ${data?.length || 0} results\n`);
    return data || [];
    
  } catch (e) {
    console.error('❌ Unexpected error:', e);
    return [];
  }
}

// Test searches
async function runTests() {
  // Test 1: Original problem - "sneakers"
  await testSearch('sneakers');
  
  // Test 2: Abstract concept - "future"
  await testSearch('future');
  
  // Test 3: Another abstract concept - "money"
  await testSearch('money');
  
  // Test 4: Community-related - "friends"
  await testSearch('friends');
  
  // Test 5: Action-oriented - "build"
  await testSearch('build');
}

runTests().then(() => {
  console.log('\n✨ Search tests complete!');
  process.exit(0);
});