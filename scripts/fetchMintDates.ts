#!/usr/bin/env tsx

import { supabase } from '../lib/supabase'

const COLLECTIONS = [
  {
    address: '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',
    network: 'ETHEREUM-MAINNET' as const,
    rpc: 'https://cloudflare-eth.com',
    chainId: 1
  },
  {
    address: '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b',
    network: 'ZORA-MAINNET' as const,
    rpc: 'https://rpc.zora.energy',
    chainId: 7777777
  }
]

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

async function rpcCall(rpc: string, method: string, params: any[]) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })
  if (!res.ok) throw new Error(`RPC error ${res.status}`)
  const j = await res.json()
  if (j.error) throw new Error(`RPC error: ${JSON.stringify(j.error)}`)
  return j.result
}

function hexToNumber(hex: string): number {
  return parseInt(hex, 16)
}

function padAddress(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0')
}

function decodeTokenId(topic: string): string {
  return BigInt(topic).toString(10)
}

async function getBlockTimestamp(rpc: string, blockNumber: string): Promise<number> {
  const block = await rpcCall(rpc, 'eth_getBlockByNumber', [blockNumber, false])
  return hexToNumber(block.timestamp)
}

async function getMintDatesForCollection(collection: typeof COLLECTIONS[0]) {
  console.log(`Fetching mint dates for ${collection.network} collection...`)
  
  // Get current block
  const currentBlock = await rpcCall(collection.rpc, 'eth_blockNumber', [])
  console.log(`Current block: ${hexToNumber(currentBlock)}`)
  
  // Find deployment block using binary search to find first Transfer event
  let fromBlock = collection.chainId === 1 ? 0x10e3640 : 0x1 // Start from reasonable blocks
  let toBlock = hexToNumber(currentBlock)
  
  console.log('Finding deployment block...')
  
  // Get first few Transfer events to find deployment
  const firstLogs = await rpcCall(collection.rpc, 'eth_getLogs', [{
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
    address: collection.address,
    topics: [
      TRANSFER_TOPIC,
      padAddress(ZERO_ADDRESS), // from address (0x0 for mints)
      null, // to address (any)
      null  // tokenId (any)
    ]
  }])
  
  if (firstLogs.length === 0) {
    console.log('No mint events found')
    return new Map()
  }
  
  // Get the deployment block from first mint
  const deployBlock = hexToNumber(firstLogs[0].blockNumber)
  console.log(`Contract deployed at block ${deployBlock}`)
  
  // Fetch all mint events
  const mintDates = new Map<string, Date>()
  const batchSize = 10000
  let currentFrom = deployBlock
  
  while (currentFrom <= toBlock) {
    const currentTo = Math.min(currentFrom + batchSize, toBlock)
    
    try {
      const logs = await rpcCall(collection.rpc, 'eth_getLogs', [{
        fromBlock: `0x${currentFrom.toString(16)}`,
        toBlock: `0x${currentTo.toString(16)}`,
        address: collection.address,
        topics: [
          TRANSFER_TOPIC,
          padAddress(ZERO_ADDRESS),
          null,
          null
        ]
      }])
      
      // Process logs in batches to get timestamps
      for (const log of logs) {
        const tokenId = decodeTokenId(log.topics[3])
        const blockNumber = log.blockNumber
        
        // Get block timestamp
        const timestamp = await getBlockTimestamp(collection.rpc, blockNumber)
        const mintDate = new Date(timestamp * 1000)
        
        mintDates.set(tokenId, mintDate)
        console.log(`Token ${tokenId}: ${mintDate.toISOString()}`)
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 50))
      }
      
      console.log(`Processed blocks ${currentFrom} to ${currentTo}, found ${logs.length} mints`)
    } catch (error) {
      console.error(`Error fetching logs for blocks ${currentFrom}-${currentTo}:`, error)
    }
    
    currentFrom = currentTo + 1
  }
  
  return mintDates
}

async function updateDatabase(mintDates: Map<string, Date>, collection: typeof COLLECTIONS[0]) {
  console.log(`\nUpdating database for ${collection.network}...`)
  
  // Fetch existing tokens
  const { data: tokens, error } = await supabase
    .from('nft_tokens')
    .select('id, token_id')
    .eq('collection_address', collection.address)
  
  if (error) {
    console.error('Failed to fetch tokens:', error)
    return
  }
  
  if (!tokens || tokens.length === 0) {
    console.log('No tokens found in database')
    return
  }
  
  // Update in batches
  const updates = tokens
    .filter(t => mintDates.has(t.token_id))
    .map(t => ({
      id: t.id,
      created_at: mintDates.get(t.token_id)!.toISOString()
    }))
  
  if (updates.length === 0) {
    console.log('No updates needed')
    return
  }
  
  // Update in chunks
  const chunkSize = 100
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    
    for (const update of chunk) {
      const { error: updateError } = await supabase
        .from('nft_tokens')
        .update({ created_at: update.created_at })
        .eq('id', update.id)
      
      if (updateError) {
        console.error(`Failed to update token ${update.id}:`, updateError)
      }
    }
    
    console.log(`Updated ${Math.min(i + chunkSize, updates.length)} of ${updates.length} tokens`)
  }
  
  // Check for missing tokens
  const dbTokenIds = new Set(tokens.map(t => t.token_id))
  const missingTokens = Array.from(mintDates.keys()).filter(id => !dbTokenIds.has(id))
  
  if (missingTokens.length > 0) {
    console.log(`\nFound ${missingTokens.length} tokens on chain but not in database:`)
    console.log(missingTokens.join(', '))
  }
}

async function main() {
  for (const collection of COLLECTIONS) {
    try {
      const mintDates = await getMintDatesForCollection(collection)
      
      if (mintDates.size > 0) {
        await updateDatabase(mintDates, collection)
        
        // Summary
        const dates = Array.from(mintDates.values()).sort((a, b) => a.getTime() - b.getTime())
        console.log(`\nSummary for ${collection.network}:`)
        console.log(`Total tokens: ${mintDates.size}`)
        console.log(`First mint: ${dates[0].toISOString()}`)
        console.log(`Last mint: ${dates[dates.length - 1].toISOString()}`)
      }
    } catch (error) {
      console.error(`Failed to process ${collection.network}:`, error)
    }
  }
}

main().catch(console.error)