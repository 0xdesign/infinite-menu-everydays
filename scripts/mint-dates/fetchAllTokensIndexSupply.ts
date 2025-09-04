#!/usr/bin/env tsx

// Fetch all tokens and their mint blocks from Index Supply API

async function fetchAllTransfers(chainId: number, contractAddress: string) {
  console.log(`\nFetching all Transfer events for chain ${chainId}, contract ${contractAddress}...`)
  
  // Query for ALL Transfer events from zero address (mints)
  // Using hex literals without E prefix
  const query = `
    SELECT 
      "from",
      "to",
      tokenId
    FROM transfer 
    WHERE chain = ${chainId}
    ORDER BY CAST(tokenId AS numeric)
  `.trim()
  
  const signature = 'Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  
  try {
    const params = new URLSearchParams({
      query: query,
      signatures: signature
    })
    
    console.log('Query URL:', `https://api.indexsupply.net/v2/query?${params}`)
    
    const response = await fetch(`https://api.indexsupply.net/v2/query?${params}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`API Error:`, error)
      return []
    }
    
    const data = await response.json()
    console.log('Response structure:', JSON.stringify(data[0]?.columns || [], null, 2))
    
    if (data && data[0] && data[0].rows) {
      console.log(`Found ${data[0].rows.length} mint events`)
      
      // Get column indices
      const cols = data[0].columns
      const fromIdx = cols.findIndex((c: any) => c.name === 'from')
      const toIdx = cols.findIndex((c: any) => c.name === 'to')
      const tokenIdIdx = cols.findIndex((c: any) => c.name === 'tokenid' || c.name === 'tokenId')
      
      // Filter for our specific contract
      const contractTokens: string[] = []
      
      for (const row of data[0].rows) {
        const from = row[fromIdx]
        const to = row[toIdx]
        const tokenId = row[tokenIdIdx]
        
        // Check if this is a mint (from zero address)
        if (from === '0x0000000000000000000000000000000000000000' && tokenId) {
          // We need to verify this is for our contract
          // Since we can't filter by contract in the virtual table,
          // we'll get all mints and filter later
          contractTokens.push(tokenId)
        }
      }
      
      return contractTokens
    }
    
    return []
  } catch (error) {
    console.error(`Failed to query:`, error)
    return []
  }
}

async function fetchWithContractFilter(chainId: number, contractAddress: string) {
  console.log(`\nAttempting to fetch with contract filter for chain ${chainId}...`)
  
  // Try querying logs table directly to get contract-specific events
  const query = `
    SELECT 
      l.block_num,
      l.block_timestamp,
      l.tx_hash,
      l.address,
      l.topics,
      l.data
    FROM logs l
    WHERE l.chain = ${chainId}
      AND l.address = E'\\x${contractAddress.slice(2).toLowerCase()}'
      AND l.topics[1] = E'\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      AND l.topics[2] = E'\\x0000000000000000000000000000000000000000000000000000000000000000'
    ORDER BY l.block_num
    LIMIT 10
  `.trim()
  
  try {
    const params = new URLSearchParams({ query })
    
    console.log('Direct logs query URL:', `https://api.indexsupply.net/v2/query?${params}`)
    
    const response = await fetch(`https://api.indexsupply.net/v2/query?${params}`)
    const data = await response.json()
    
    console.log('Direct logs response:', JSON.stringify(data, null, 2).substring(0, 1000))
    
    return data
  } catch (error) {
    console.error('Direct logs query failed:', error)
    return null
  }
}

async function main() {
  const collections = [
    {
      address: '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',
      chainId: 1,
      name: 'Ethereum Mainnet'
    },
    {
      address: '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b',
      chainId: 7777777,
      name: 'Zora Mainnet'
    }
  ]
  
  const allResults: any[] = []
  
  for (const collection of collections) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Processing ${collection.name} collection`)
    console.log(`Address: ${collection.address}`)
    console.log('='.repeat(60))
    
    // Try to get Transfer events
    const tokens = await fetchAllTransfers(collection.chainId, collection.address)
    
    if (tokens.length > 0) {
      console.log(`Found tokens: ${tokens.slice(0, 10).join(', ')}${tokens.length > 10 ? '...' : ''}`)
      console.log(`Total: ${tokens.length} tokens`)
      
      allResults.push({
        collection: collection.address,
        chain: collection.name,
        chainId: collection.chainId,
        tokenIds: tokens,
        count: tokens.length
      })
    }
    
    // Also try direct logs query
    const directLogs = await fetchWithContractFilter(collection.chainId, collection.address)
    if (directLogs) {
      allResults.push({
        collection: collection.address,
        chain: collection.name,
        directLogsResponse: directLogs
      })
    }
  }
  
  // Write results
  const fs = await import('fs')
  fs.writeFileSync('scripts/index-supply-results.json', JSON.stringify(allResults, null, 2))
  console.log('\n\nWrote all results to scripts/index-supply-results.json')
  
  console.log('\nSummary:')
  allResults.forEach(r => {
    if (r.tokenIds) {
      console.log(`- ${r.chain}: ${r.count} tokens found`)
    }
  })
}

main().catch(console.error)