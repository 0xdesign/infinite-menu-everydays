import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '0x5908eb01497b5d8e53c339ea0186050d487c8d0c';

// Alternative 1: Using Alchemy NFT API
async function getStatsFromAlchemy() {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
  if (!ALCHEMY_API_KEY) {
    console.log('❌ Alchemy API key not found. Set ALCHEMY_API_KEY in .env file');
    return null;
  }

  const baseURL = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  
  try {
    // Get collection metadata
    const metadataResponse = await fetch(`${baseURL}/getContractMetadata?contractAddress=${COLLECTION_ADDRESS}`);
    const metadata = await metadataResponse.json();
    
    // Get owners
    const ownersResponse = await fetch(`${baseURL}/getOwnersForContract?contractAddress=${COLLECTION_ADDRESS}&withTokenBalances=true`);
    const ownersData = await ownersResponse.json();
    
    return {
      totalSupply: metadata.totalSupply || 'Unknown',
      uniqueHolders: ownersData.owners?.length || 0,
      name: metadata.name,
      symbol: metadata.symbol
    };
  } catch (error) {
    console.error('Alchemy API error:', error.message);
    return null;
  }
}

// Alternative 2: Using OpenSea API
async function getStatsFromOpenSea() {
  const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
  const headers = {
    'Accept': 'application/json',
    ...(OPENSEA_API_KEY ? { 'X-API-KEY': OPENSEA_API_KEY } : {})
  };

  try {
    const response = await fetch(`https://api.opensea.io/api/v2/collection/${COLLECTION_ADDRESS}/stats`, { headers });
    const stats = await response.json();
    
    return {
      totalSupply: stats.total_supply || 'Unknown',
      numOwners: stats.num_owners || 0,
      floorPrice: stats.floor_price || 0,
      totalVolume: stats.total_volume || 0
    };
  } catch (error) {
    console.error('OpenSea API error:', error.message);
    return null;
  }
}

// Alternative 3: Direct Ethereum RPC call (requires knowing the contract ABI)
async function getStatsFromEthereumRPC() {
  const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
  
  try {
    // Get latest block to estimate activity
    const blockResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const blockData = await blockResponse.json();
    console.log('Connected to Ethereum RPC. Latest block:', parseInt(blockData.result, 16));
    
    // Note: To get actual NFT data, you'd need the contract ABI and make specific calls
    console.log('To get NFT holder data via RPC, you would need:');
    console.log('1. The contract ABI');
    console.log('2. Call totalSupply() method');
    console.log('3. Use event logs to track Transfer events and calculate unique holders');
    
    return null;
  } catch (error) {
    console.error('Ethereum RPC error:', error.message);
    return null;
  }
}

// Alternative 4: Using Moralis API
async function getStatsFromMoralis() {
  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    console.log('❌ Moralis API key not found. Set MORALIS_API_KEY in .env file');
    return null;
  }

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'X-API-Key': MORALIS_API_KEY
    }
  };

  try {
    // Get NFT owners
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/nft/${COLLECTION_ADDRESS}/owners?chain=eth&format=decimal`,
      options
    );
    const data = await response.json();
    
    return {
      uniqueHolders: data.total || 0,
      pageSize: data.page_size,
      cursor: data.cursor
    };
  } catch (error) {
    console.error('Moralis API error:', error.message);
    return null;
  }
}

// Main function to try alternative data sources
async function main() {
  console.log('=== Alternative NFT Data Sources ===\n');
  console.log(`Collection: ${COLLECTION_ADDRESS}\n`);
  
  console.log('Since Zora API is unavailable, here are alternative data sources:\n');
  
  // Try Alchemy
  console.log('1. Alchemy NFT API:');
  const alchemyData = await getStatsFromAlchemy();
  if (alchemyData) {
    console.log(`   ✅ Total Supply: ${alchemyData.totalSupply}`);
    console.log(`   ✅ Unique Holders: ${alchemyData.uniqueHolders}`);
  } else {
    console.log('   ❌ Not available (requires API key)');
  }
  
  console.log('\n2. OpenSea API:');
  const openSeaData = await getStatsFromOpenSea();
  if (openSeaData) {
    console.log(`   ✅ Total Supply: ${openSeaData.totalSupply}`);
    console.log(`   ✅ Number of Owners: ${openSeaData.numOwners}`);
  } else {
    console.log('   ❌ Not available (may require API key for some endpoints)');
  }
  
  console.log('\n3. Direct Ethereum RPC:');
  await getStatsFromEthereumRPC();
  
  console.log('\n4. Moralis API:');
  const moralisData = await getStatsFromMoralis();
  if (moralisData) {
    console.log(`   ✅ Unique Holders: ${moralisData.uniqueHolders}`);
  } else {
    console.log('   ❌ Not available (requires API key)');
  }
  
  console.log('\n=== Setup Instructions ===');
  console.log('To use these alternatives, add the following to your .env file:');
  console.log('- ALCHEMY_API_KEY=your_alchemy_key');
  console.log('- OPENSEA_API_KEY=your_opensea_key (optional)');
  console.log('- MORALIS_API_KEY=your_moralis_key');
  console.log('- ETH_RPC_URL=your_ethereum_rpc_url');
  
  console.log('\n=== Recommended Approach ===');
  console.log('For production use when Zora is down:');
  console.log('1. Use Alchemy NFT API for comprehensive NFT data');
  console.log('2. Cache results to reduce API calls');
  console.log('3. Implement fallback to multiple providers');
  console.log('4. Consider using The Graph Protocol for decentralized queries');
}

main().catch(console.error);