#!/usr/bin/env tsx

// Test various Index Supply API endpoints to find the right format

async function testEndpoint(url: string, description: string) {
  console.log(`\nTesting: ${description}`)
  console.log(`URL: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    console.log(`Status: ${response.status}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const text = await response.text()
      console.log(`Response (first 500 chars):`, text.substring(0, 500))
      
      try {
        const json = JSON.parse(text)
        console.log('Parsed JSON:', JSON.stringify(json, null, 2).substring(0, 1000))
      } catch {
        console.log('Response is not JSON')
      }
    } else {
      const text = await response.text()
      console.log(`Error response:`, text.substring(0, 500))
    }
  } catch (error) {
    console.log(`Error:`, error)
  }
}

async function main() {
  const collection = '0x5908eb01497b5d8e53c339ea0186050d487c8d0c'
  const tokenId = '1'
  
  // Test different Index Supply endpoint formats
  await testEndpoint(
    `https://api.indexsupply.com/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .com - collections/tokens'
  )
  
  await testEndpoint(
    `https://api.indexsupply.net/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .net - collections/tokens'
  )
  
  await testEndpoint(
    `https://api.indexsupply.com/mainnet/nft/${collection}/${tokenId}`,
    'IndexSupply .com - mainnet/nft'
  )
  
  await testEndpoint(
    `https://api.indexsupply.com/mainnet/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .com - mainnet/collections/tokens'
  )
  
  await testEndpoint(
    `https://api.indexsupply.net/mainnet/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .net - mainnet/collections/tokens'
  )
  
  await testEndpoint(
    `https://indexsupply.com/api/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply main site - api/collections'
  )
  
  await testEndpoint(
    `https://www.indexsupply.com/api/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply www - api/collections'
  )
  
  await testEndpoint(
    `https://api.indexsupply.com/v1/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .com - v1/collections/tokens'
  )
  
  await testEndpoint(
    `https://api.indexsupply.net/v1/collections/${collection}/tokens/${tokenId}`,
    'IndexSupply .net - v1/collections/tokens'
  )
}

main().catch(console.error)