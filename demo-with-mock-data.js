import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '0x5908eb01497b5d8e53c339ea0186050d487c8d0c';
const MAX_SUPPLY = parseInt(process.env.MAX_SUPPLY || '1000');

// Mock data simulating a typical NFT collection response
const mockApiResponse = {
  data: {
    aggregateStat: {
      nftCount: 840,      // Example: 840 tokens minted
      ownerCount: 580     // Example: 580 unique holders
    }
  }
};

// Function to simulate getting collection stats
const getCollectionStats = async () => {
  console.log('=== NFT Collection Statistics Demo ===\n');
  console.log('Note: Using mock data since Zora API is currently unavailable\n');
  
  console.log(`Collection Address: ${COLLECTION_ADDRESS}`);
  console.log(`Max Supply: ${MAX_SUPPLY}\n`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Use mock data
  const stats = mockApiResponse.data.aggregateStat;
  const totalMinted = stats.nftCount;
  const uniqueHolders = stats.ownerCount;
  const unmintedItems = MAX_SUPPLY - totalMinted;
  
  console.log('=== RESULTS ===\n');
  console.log(`Number of Holders: ${uniqueHolders}`);
  console.log(`Number of Unminted: ${unmintedItems}`);
  
  console.log('\n=== Additional Statistics ===');
  console.log(`Total Minted: ${totalMinted}`);
  console.log(`Minting Progress: ${(totalMinted / MAX_SUPPLY * 100).toFixed(2)}% complete`);
  console.log(`Average Tokens per Holder: ${(totalMinted / uniqueHolders).toFixed(2)}`);
  console.log(`Holder Ratio: ${(uniqueHolders / totalMinted * 100).toFixed(2)}% unique holders`);
  
  // Distribution insights
  console.log('\n=== Distribution Insights ===');
  if (uniqueHolders / totalMinted > 0.6) {
    console.log('✅ Good distribution: High ratio of unique holders');
  } else if (uniqueHolders / totalMinted > 0.4) {
    console.log('⚠️  Moderate distribution: Some concentration of holdings');
  } else {
    console.log('🚨 High concentration: Many tokens held by few addresses');
  }
  
  return {
    holders: uniqueHolders,
    unminted: unmintedItems,
    totalMinted: totalMinted
  };
};

// Execute the demo
console.log('Starting NFT collection statistics demo...\n');
getCollectionStats()
  .then(results => {
    console.log('\n=== Summary Object ===');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });