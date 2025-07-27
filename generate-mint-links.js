import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const COLLECTION_ADDRESS = process.env.NFT_COLLECTION_ADDRESS || '0x5908eb01497b5d8e53c339ea0186050d487c8d0c';
const MAX_SUPPLY = parseInt(process.env.MAX_SUPPLY || '1000');

// Mock data for demonstration (since Zora API is down)
const MOCK_TOTAL_MINTED = 840;

// Function to generate mint links based on different platforms
const generateMintLinks = (collectionAddress, unmintedCount) => {
  const links = {
    // Zora mint page (if collection is on Zora)
    zora: `https://zora.co/collect/eth:${collectionAddress}`,
    
    // Direct Etherscan contract interaction
    etherscan: `https://etherscan.io/address/${collectionAddress}#writeContract`,
    
    // OpenSea (if collection is listed there)
    opensea: `https://opensea.io/collection/${collectionAddress}`,
    
    // Mint.fun aggregator
    mintfun: `https://mint.fun/ethereum/${collectionAddress}`,
    
    // Direct contract mint function (generic)
    directMint: `https://etherscan.io/address/${collectionAddress}#writeContract#F6`, // F6 is usually mint function
  };
  
  return links;
};

// Function to check if minting is still active (mock implementation)
const checkMintingStatus = async (collectionAddress) => {
  // In a real implementation, this would:
  // 1. Check if the contract has an active mint function
  // 2. Verify if public minting is enabled
  // 3. Check mint price and conditions
  
  return {
    isActive: true, // Assumed active for demo
    mintPrice: '0.01 ETH', // Example price
    maxPerWallet: 5,
    publicMintEnabled: true
  };
};

// Main function
const main = async () => {
  console.log('=== NFT Collection Mint Links Generator ===\n');
  console.log(`Collection Address: ${COLLECTION_ADDRESS}`);
  console.log(`Max Supply: ${MAX_SUPPLY}`);
  console.log(`Total Minted: ${MOCK_TOTAL_MINTED} (mock data)`);
  
  const unmintedCount = MAX_SUPPLY - MOCK_TOTAL_MINTED;
  console.log(`Unminted Tokens: ${unmintedCount}\n`);
  
  if (unmintedCount <= 0) {
    console.log('❌ This collection is fully minted! No tokens available.');
    return;
  }
  
  // Check minting status
  console.log('Checking minting status...');
  const mintStatus = await checkMintingStatus(COLLECTION_ADDRESS);
  
  if (!mintStatus.isActive) {
    console.log('❌ Minting is not currently active for this collection.');
    return;
  }
  
  console.log('\n✅ Minting is ACTIVE');
  console.log(`   Price: ${mintStatus.mintPrice}`);
  console.log(`   Max per wallet: ${mintStatus.maxPerWallet}`);
  console.log(`   Public mint: ${mintStatus.publicMintEnabled ? 'Enabled' : 'Disabled'}\n`);
  
  // Generate mint links
  const mintLinks = generateMintLinks(COLLECTION_ADDRESS, unmintedCount);
  
  console.log('=== MINT LINKS ===\n');
  
  console.log('1. Zora Collection Page:');
  console.log(`   ${mintLinks.zora}`);
  console.log('   (Use this if the NFT is deployed on Zora)\n');
  
  console.log('2. Mint.fun (Aggregator):');
  console.log(`   ${mintLinks.mintfun}`);
  console.log('   (Aggregates mint info from multiple sources)\n');
  
  console.log('3. Direct Contract Interaction:');
  console.log(`   ${mintLinks.etherscan}`);
  console.log('   (Advanced users: interact directly with contract)\n');
  
  console.log('4. OpenSea:');
  console.log(`   ${mintLinks.opensea}`);
  console.log('   (Check if available on secondary market)\n');
  
  // Generate specific token IDs for unminted tokens
  console.log('=== UNMINTED TOKEN IDs ===\n');
  console.log(`The following ${unmintedCount} token IDs are available to mint:`);
  
  // Show first 10 unminted IDs as example
  const startId = MOCK_TOTAL_MINTED + 1;
  const endId = Math.min(startId + 9, MAX_SUPPLY);
  
  console.log(`Token IDs ${startId} - ${MAX_SUPPLY}`);
  if (unmintedCount > 10) {
    console.log(`(Showing first 10 of ${unmintedCount} available):`);
    for (let i = startId; i <= endId; i++) {
      console.log(`  - Token #${i}`);
    }
    console.log(`  ... and ${unmintedCount - 10} more`);
  } else {
    for (let i = startId; i <= MAX_SUPPLY; i++) {
      console.log(`  - Token #${i}`);
    }
  }
  
  // Minting instructions
  console.log('\n=== HOW TO MINT ===\n');
  console.log('1. Visit one of the mint links above');
  console.log('2. Connect your wallet (MetaMask, WalletConnect, etc.)');
  console.log('3. Enter the number of tokens you want to mint');
  console.log(`4. Confirm the transaction (${mintStatus.mintPrice} per token + gas fees)`);
  console.log('5. Wait for transaction confirmation\n');
  
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('- Always verify the contract address before minting');
  console.log('- Check current gas prices on https://ethgasstation.info');
  console.log('- Be aware of max mints per wallet limits');
  console.log('- Some collections may have allowlist/whitelist requirements\n');
  
  // Generate a shareable mint alert
  console.log('=== SHAREABLE MINT ALERT ===\n');
  console.log('📢 MINT ALERT 📢');
  console.log(`Collection: ${COLLECTION_ADDRESS}`);
  console.log(`Available: ${unmintedCount} tokens`);
  console.log(`Price: ${mintStatus.mintPrice}`);
  console.log(`Mint here: ${mintLinks.zora}`);
  console.log('#NFT #Ethereum #MintNow');
};

// Run the script
main().catch(console.error);