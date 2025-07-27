import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ZORA_API = 'https://api.zora.co/graphql';
const API_KEY = process.env.ZORA_API_KEY;
const COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '0x5908eb01497b5d8e53c339ea0186050d487c8d0c';
const MAX_SUPPLY = parseInt(process.env.MAX_SUPPLY || '1000');

// Retry wrapper for API calls
const retryFetch = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      
      // Check if response is valid JSON
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        throw new Error(`Invalid response from API: ${text}`);
      }
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// Main function to get holder count and unminted items
const getCollectionStats = async () => {
  const query = `
    query($collection: [String!]) {
      aggregateStat {
        nftCount(where: { collectionAddresses: $collection }, networks: { network: ETHEREUM, chain: MAINNET })
        ownerCount(where: { collectionAddresses: $collection }, networks: { network: ETHEREUM, chain: MAINNET })
      }
    }
  `;
  
  const variables = { collection: [COLLECTION_ADDRESS] };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-KEY': API_KEY } : {})
    },
    body: JSON.stringify({ query, variables })
  };

  try {
    console.log('Fetching NFT Collection Statistics...\n');
    console.log(`Collection: ${COLLECTION_ADDRESS}`);
    console.log(`Max Supply: ${MAX_SUPPLY}\n`);
    
    const result = await retryFetch(ZORA_API, options);
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const stats = result.data.aggregateStat;
    const totalMinted = stats.nftCount || 0;
    const uniqueHolders = stats.ownerCount || 0;
    const unmintedItems = MAX_SUPPLY - totalMinted;
    
    console.log('=== RESULTS ===\n');
    console.log(`Number of Holders: ${uniqueHolders}`);
    console.log(`Number of Unminted: ${unmintedItems}`);
    console.log('\nAdditional Info:');
    console.log(`- Total Minted: ${totalMinted}`);
    console.log(`- Minting Progress: ${(totalMinted / MAX_SUPPLY * 100).toFixed(2)}%`);
    
    return {
      holders: uniqueHolders,
      unminted: unmintedItems,
      totalMinted: totalMinted
    };
    
  } catch (error) {
    console.error('\nError fetching data:', error.message);
    
    // Provide alternative endpoint suggestion
    console.log('\nNote: If the API is down, you can try:');
    console.log('1. Using a different RPC endpoint to query the contract directly');
    console.log('2. Checking https://zora.co for API status');
    console.log('3. Using an alternative NFT data provider like OpenSea API or Alchemy NFT API');
    
    throw error;
  }
};

// Execute
getCollectionStats().catch(() => process.exit(1));