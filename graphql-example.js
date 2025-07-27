import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ZORA_API = 'https://api.zora.co/graphql';
const API_KEY = process.env.ZORA_API_KEY;
const COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '0x5908eb01497b5d8e53c339ea0186050d487c8d0c';
const MAX_SUPPLY = parseInt(process.env.MAX_SUPPLY || '1000');

// GraphQL query to get collection statistics
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

  try {
    const response = await fetch(ZORA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-KEY': API_KEY } : {})
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.aggregateStat;
  } catch (error) {
    console.error('Error fetching collection stats:', error);
    throw error;
  }
};

// GraphQL query to get list of token holders
const getTokenHolders = async (limit = 100) => {
  const query = `
    query($collection: [String!], $limit: Int!) {
      ownersByCount(
        where: { collectionAddresses: $collection }
        networks: { network: ETHEREUM, chain: MAINNET }
        pagination: { limit: $limit }
      ) {
        nodes {
          ownerAddress
          count
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  
  const variables = { 
    collection: [COLLECTION_ADDRESS],
    limit: limit
  };

  try {
    const response = await fetch(ZORA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-KEY': API_KEY } : {})
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.ownersByCount;
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw error;
  }
};

// GraphQL query to get highest token ID (for estimating max supply if unknown)
const getHighestTokenId = async () => {
  const query = `
    query($collection: [String!]) {
      tokens(
        where: { collectionAddresses: $collection }
        networks: { network: ETHEREUM, chain: MAINNET }
        pagination: { limit: 1 }
        sort: { sortKey: TOKEN_ID, sortDirection: DESC }
      ) {
        nodes {
          token {
            tokenId
          }
        }
      }
    }
  `;
  
  const variables = { collection: [COLLECTION_ADDRESS] };

  try {
    const response = await fetch(ZORA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-KEY': API_KEY } : {})
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const tokens = result.data.tokens.nodes;
    return tokens.length > 0 ? parseInt(tokens[0].token.tokenId) : 0;
  } catch (error) {
    console.error('Error fetching highest token ID:', error);
    throw error;
  }
};

// Main function to demonstrate all features
const main = async () => {
  console.log('=== Zora NFT Collection Stats (GraphQL Example) ===\n');
  console.log(`Collection Address: ${COLLECTION_ADDRESS}`);
  console.log(`API Key: ${API_KEY ? 'Configured' : 'Not configured (using rate-limited access)'}\n`);

  try {
    // 1. Fetch basic collection statistics
    console.log('Fetching collection statistics...');
    const stats = await getCollectionStats();
    
    console.log(`\n📊 Collection Statistics:`);
    console.log(`  - Total Minted (Supply): ${stats.nftCount}`);
    console.log(`  - Unique Holders: ${stats.ownerCount}`);
    
    // Calculate unminted items if we have a max supply
    if (stats.nftCount !== null && MAX_SUPPLY) {
      const unminted = MAX_SUPPLY - stats.nftCount;
      console.log(`  - Max Supply: ${MAX_SUPPLY}`);
      console.log(`  - Unminted Items: ${unminted} (${(unminted / MAX_SUPPLY * 100).toFixed(2)}% remaining)`);
    }

    // 2. Get highest token ID (alternative way to estimate supply)
    console.log('\nFetching highest token ID...');
    const highestTokenId = await getHighestTokenId();
    console.log(`\n🔢 Highest Token ID: ${highestTokenId}`);
    
    if (highestTokenId > 0) {
      console.log(`  - This suggests at least ${highestTokenId} sequential token IDs`);
      if (highestTokenId !== stats.nftCount) {
        console.log(`  - Note: Highest ID (${highestTokenId}) differs from total count (${stats.nftCount})`);
        console.log(`    This might indicate non-sequential minting or burned tokens`);
      }
    }

    // 3. Fetch top token holders
    console.log('\nFetching top token holders...');
    const holdersData = await getTokenHolders(10);
    const holders = holdersData.nodes;
    
    console.log(`\n👥 Top ${holders.length} Token Holders:`);
    holders.forEach((holder, index) => {
      const percentage = (holder.count / stats.nftCount * 100).toFixed(2);
      console.log(`  ${index + 1}. ${holder.ownerAddress}: ${holder.count} tokens (${percentage}%)`);
    });

    // Calculate concentration metrics
    const topHolderTokens = holders.reduce((sum, holder) => sum + holder.count, 0);
    const topHolderPercentage = (topHolderTokens / stats.nftCount * 100).toFixed(2);
    console.log(`\n  📈 Top ${holders.length} holders own ${topHolderTokens} tokens (${topHolderPercentage}% of supply)`);

    // Check if there are more holders to fetch
    if (holdersData.pageInfo.hasNextPage) {
      console.log(`\n  ℹ️  More holders available (showing top ${holders.length} only)`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the example
main();