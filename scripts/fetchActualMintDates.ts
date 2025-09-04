#!/usr/bin/env tsx

// Fetch actual mint dates from blockchain using Etherscan/Zora block explorers

const COLLECTIONS = [
  {
    address: '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',
    network: 'ethereum',
    explorer: 'https://api.etherscan.io/api',
    apiKey: 'YourEtherscanAPIKey' // Would need API key
  },
  {
    address: '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b', 
    network: 'zora',
    explorer: 'https://explorer.zora.energy/api',
    apiKey: '' // Zora explorer might not need API key
  }
]

async function fetchFromEtherscan(address: string, tokenId: string) {
  // Try to fetch from Etherscan API
  const url = `https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress=${address}&page=1&offset=10000&sort=asc`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    console.log('Etherscan response:', data)
  } catch (error) {
    console.error('Etherscan error:', error)
  }
}

async function fetchFromZoraExplorer(address: string) {
  // Try Zora's GraphQL API
  const query = `
    query GetTokens($address: String!) {
      tokens(where: { address: $address }) {
        tokenId
        mintTimestamp
        owner
      }
    }
  `
  
  try {
    const response = await fetch('https://api.zora.co/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { address }
      })
    })
    
    const data = await response.json()
    console.log('Zora API response:', data)
  } catch (error) {
    console.error('Zora API error:', error)
  }
}

async function fetchFromAlchemy(address: string, network: string) {
  // Try Alchemy NFT API (would need API key)
  const baseURL = network === 'ethereum' 
    ? 'https://eth-mainnet.g.alchemy.com/nft/v3/YOUR-API-KEY'
    : 'https://zora-mainnet.g.alchemy.com/nft/v3/YOUR-API-KEY'
    
  const url = `${baseURL}/getNFTsForContract?contractAddress=${address}&withMetadata=true`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    console.log('Alchemy response:', data)
  } catch (error) {
    console.error('Alchemy error:', error)
  }
}

async function fetchFromSimpleHash(address: string, chainId: string) {
  // Try SimpleHash API (would need API key)
  const url = `https://api.simplehash.com/api/v0/nfts/ethereum/${address}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': 'YOUR_API_KEY'
      }
    })
    const data = await response.json()
    console.log('SimpleHash response:', data)
  } catch (error) {
    console.error('SimpleHash error:', error)
  }
}

async function main() {
  console.log('Testing various blockchain data APIs...\n')
  
  // Test Ethereum collection
  const ethAddress = '0x5908eb01497b5d8e53c339ea0186050d487c8d0c'
  console.log('Testing Ethereum collection:', ethAddress)
  
  await fetchFromEtherscan(ethAddress, '1')
  await fetchFromAlchemy(ethAddress, 'ethereum')
  await fetchFromSimpleHash(ethAddress, '1')
  
  // Test Zora collection  
  const zoraAddress = '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b'
  console.log('\nTesting Zora collection:', zoraAddress)
  
  await fetchFromZoraExplorer(zoraAddress)
  await fetchFromAlchemy(zoraAddress, 'zora')
}

main().catch(console.error)