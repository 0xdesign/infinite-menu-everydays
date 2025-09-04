#!/usr/bin/env tsx

// Check Zora collections on Ethereum and Zora networks via public RPC (no API keys),
// compare with DB contents, and write missing items with metadata to JSON.

import { supabase } from '../../lib/supabase'

const COLLECTIONS = [
  {
    address: '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',
    network: 'ETHEREUM-MAINNET' as const,
    rpc: 'https://cloudflare-eth.com',
    zoraChainPrefix: 'eth'
  },
  {
    address: '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b',
    network: 'ZORA-MAINNET' as const,
    rpc: 'https://rpc.zora.energy',
    zoraChainPrefix: 'zora'
  }
]

type Collection = typeof COLLECTIONS[number]

type MissingItem = {
  token_id: string
  title: string | null
  description: string | null
  image_url: string | null
  original_url: string | null
  network: string
  collection_address: string
  raw_metadata: any
}

const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // keccak256("Transfer(address,address,uint256)")
const ZERO_ADDR_TOPIC = '0x' + '0'.repeat(64)

async function rpcCall(rpc: string, method: string, params: any[]) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })
  if (!res.ok) throw new Error(`RPC error ${res.status} ${res.statusText}`)
  const j = await res.json()
  if (j.error) throw new Error(`RPC error: ${JSON.stringify(j.error)}`)
  return j.result
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex)
}

function hexToNumberString(hex: string): string {
  return hexToBigInt(hex).toString(10)
}

function ipfsToHttp(u: string | null | undefined): string | null {
  if (!u) return null
  if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.slice('ipfs://'.length)}`
  return u
}

async function ownerOf(col: Collection, tokenId: string): Promise<string | null> {
  // ownerOf(uint256) selector 0x6352211e
  const selector = '0x6352211e'
  const tokenIdHex = '0x' + BigInt(tokenId).toString(16)
  const data = selector + tokenIdHex.slice(2).padStart(64, '0')
  try {
    const result: string = await rpcCall(col.rpc, 'eth_call', [
      { to: col.address, data },
      'latest'
    ])
    if (!result || result === '0x') return null
    const hex = result.startsWith('0x') ? result.slice(2) : result
    // address is right-aligned 32 bytes; take last 40 chars
    const addr = '0x' + hex.slice(-40)
    if (/^0x0{40}$/.test(addr)) return null
    return addr
  } catch {
    return null
  }
}

async function listMissingByProbing(col: Collection, existing: Set<string>): Promise<string[]> {
  let maxExisting = BigInt(0)
  for (const t of existing) {
    try { const n = BigInt(t); if (n > maxExisting) maxExisting = n } catch {}
  }

  const missing: string[] = []
  // Backfill gaps up to current max
  for (let i = BigInt(1); i <= maxExisting; i = i + BigInt(1)) {
    const id = i.toString(10)
    if (existing.has(id)) continue
    const owner = await ownerOf(col, id)
    if (owner) missing.push(id)
    await new Promise((r) => setTimeout(r, 60))
  }

  // Probe forward for new mints without logs
  let consecutiveMisses = 0
  const stopAfter = 25
  for (let i = maxExisting + BigInt(1); i < maxExisting + BigInt(1000); i = i + BigInt(1)) {
    const id = i.toString(10)
    const owner = await ownerOf(col, id)
    if (owner) {
      missing.push(id)
      consecutiveMisses = 0
    } else {
      consecutiveMisses++
      if (consecutiveMisses >= stopAfter) break
    }
    await new Promise((r) => setTimeout(r, 60))
  }

  return missing
}

async function getExistingTokenIds(col: Collection): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('nft_tokens')
    .select('token_id')
    .eq('collection_address', col.address)
  if (error) throw error
  return new Set((data || []).map((r: any) => String(r.token_id)))
}

async function callTokenURI(col: Collection, tokenId: string): Promise<string | null> {
  // tokenURI(uint256) selector 0xc87b56dd
  const selector = '0xc87b56dd'
  const tokenIdHex = '0x' + BigInt(tokenId).toString(16)
  const data = selector + tokenIdHex.slice(2).padStart(64, '0')
  try {
    const result: string = await rpcCall(col.rpc, 'eth_call', [
      {
        to: col.address,
        data
      },
      'latest'
    ])
    if (!result || result === '0x') return null
    // result is ABI-encoded string; basic decode for dynamic string
    // offset at 0x20, length at 0x40, data after
    const hex = result.startsWith('0x') ? result.slice(2) : result
    const len = Number('0x' + hex.slice(64, 128))
    const strHex = hex.slice(128, 128 + len * 2)
    const bytes = new Uint8Array(strHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    const uri = new TextDecoder().decode(bytes)
    return uri
  } catch (e) {
    return null
  }
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { 'accept': 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function buildMissingForCollection(col: Collection): Promise<MissingItem[]> {
  const existing = await getExistingTokenIds(col)
  // Use probing approach to avoid heavy log scans on public RPC
  const missing = await listMissingByProbing(col, existing)

  const out: MissingItem[] = []
  for (const token_id of missing) {
    const uriRaw = await callTokenURI(col, token_id)
    const uri = ipfsToHttp(uriRaw)
    let meta: any = null
    if (uri) meta = await fetchJson(uri)

    const title = (meta?.name as string) || null
    const description = (meta?.description as string) || null
    const image_url = ipfsToHttp((meta?.image as string) || (meta?.image_url as string))
    const original_url = `https://zora.co/collect/${col.zoraChainPrefix}:${col.address}/${token_id}`

    out.push({
      token_id: String(token_id),
      title,
      description,
      image_url,
      original_url,
      network: col.network,
      collection_address: col.address,
      raw_metadata: meta
    })
  }

  return out
}

async function main() {
  const all: MissingItem[] = []
  for (const col of COLLECTIONS) {
    const missing = await buildMissingForCollection(col)
    all.push(...missing)
  }
  const fs = await import('fs')
  fs.writeFileSync('data/missing-zora.json', JSON.stringify(all, null, 2))
  console.log(`Wrote ${all.length} missing item(s) to data/missing-zora.json`)

  if (all.length) {
    console.log('Inserting missing items into database...')
    // chunk inserts to avoid payload issues
    const chunkSize = 100
    for (let i = 0; i < all.length; i += chunkSize) {
      const chunk = all.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('nft_tokens')
        .insert(
          chunk.map((m) => ({
            token_id: m.token_id,
            title: m.title,
            description: m.description,
            image_url: m.image_url,
            original_url: m.original_url,
            network: m.network,
            collection_address: m.collection_address,
            raw_metadata: m.raw_metadata
          }))
        )
      if (error) {
        console.error('Insert error:', error)
        throw error
      }
    }
    console.log('Insert complete.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
