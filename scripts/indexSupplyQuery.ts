#!/usr/bin/env tsx

// Query Index Supply for mint dates with proper joins

async function queryCollection(chainId: number, contractAddress: string, collectionName: string) {
  console.log(`\nQuerying ${collectionName}...`)
  
  // Join transfer virtual table with logs to get contract address and timestamps
  const query = `
    SELECT 
      t.chain,
      t.block_num,
      b.timestamp as block_timestamp,
      l.address as contract,
      t."from",
      t."to",
      t.tokenId
    FROM transfer t
    JOIN logs l ON l.chain = t.chain 
      AND l.block_num = t.block_num 
      AND l.log_idx = t.log_idx
    JOIN blocks b ON b.chain = l.chain 
      AND b.num = l.block_num
    WHERE t.chain = ${chainId}
      AND l.address = decode('${contractAddress.slice(2)}', 'hex')
      AND t."from" = decode('${'0'.repeat(40)}', 'hex')
    ORDER BY t.block_num
    LIMIT 500
  `.trim()
  
  const signature = 'Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  
  try {
    const params = new URLSearchParams({
      query: query,
      signatures: signature
    })
    
    console.log('Fetching from:', `https://api.indexsupply.net/v2/query`)
    
    const response = await fetch(`https://api.indexsupply.net/v2/query?${params}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`API Error:`, error)
      return []
    }
    
    const data = await response.json()
    
    if (data && data[0] && data[0].rows) {
      const result = data[0]
      console.log(`Found ${result.rows.length} mint events`)
      
      // Get column indices
      const cols = result.columns
      const blockNumIdx = cols.findIndex((c: any) => c.name === 'block_num')
      const timestampIdx = cols.findIndex((c: any) => c.name === 'block_timestamp')
      const tokenIdIdx = cols.findIndex((c: any) => c.name === 'tokenid' || c.name === 'tokenId')
      
      const mints: any[] = []
      
      for (const row of result.rows) {
        mints.push({
          tokenId: row[tokenIdIdx],
          blockNumber: row[blockNumIdx],
          timestamp: row[timestampIdx] ? new Date(parseInt(row[timestampIdx]) * 1000).toISOString() : null
        })
      }
      
      // Show first few results
      console.log('First 5 mints:')
      mints.slice(0, 5).forEach(m => {
        console.log(`  Token ${m.tokenId}: Block ${m.blockNumber}, ${m.timestamp}`)
      })
      
      return mints
    }
    
    return []
  } catch (error) {
    console.error(`Failed to query:`, error)
    return []
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
    const mints = await queryCollection(collection.chainId, collection.address, collection.name)
    
    if (mints.length > 0) {
      allResults.push({
        collection: collection.address,
        chain: collection.name,
        chainId: collection.chainId,
        mints: mints,
        count: mints.length
      })
      
      // Show date range
      const timestamps = mints.filter(m => m.timestamp).map(m => new Date(m.timestamp))
      if (timestamps.length > 0) {
        const minDate = new Date(Math.min(...timestamps.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...timestamps.map(d => d.getTime())))
        console.log(`Date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`)
      }
    }
  }
  
  // Write results
  const fs = await import('fs')
  const outputFile = 'scripts/mint-dates-from-index-supply.json'
  fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2))
  console.log(`\nWrote results to ${outputFile}`)
  
  // Now we can use these results to update the database via Supabase MCP
  console.log('\nReady to update database with actual mint dates')
}

main().catch(console.error)