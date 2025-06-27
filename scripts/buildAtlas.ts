import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TILE_SIZE = 256;
const MAX_ATLAS_SIZE = 4096;
const TILES_PER_ROW = Math.floor(MAX_ATLAS_SIZE / TILE_SIZE);
const TILES_PER_ATLAS = TILES_PER_ROW * TILES_PER_ROW;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env variables (NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE or ANON key)');
}

interface NFTToken {
  id: string;
  title: string;
  thumbnail_url: string;
}

interface AtlasMapping {
  id: string;
  atlas: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function fetchNFTTokens(): Promise<NFTToken[]> {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  const { data, error } = await supabase
    .from('nft_tokens')
    .select('id, title, thumbnail_url')
    .order('id');
    
  if (error) {
    throw new Error(`Failed to fetch tokens: ${error.message}`);
  }
  
  return data || [];
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to download image from ${url}: ${response.statusText}`);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.warn(`Error downloading image from ${url}:`, error);
    return null;
  }
}

async function buildAtlases(tokens: NFTToken[]): Promise<AtlasMapping[]> {
  const publicDir = path.join(process.cwd(), 'public');
  await fs.mkdir(publicDir, { recursive: true });
  
  const mappings: AtlasMapping[] = [];
  const atlasCount = Math.ceil(tokens.length / TILES_PER_ATLAS);
  
  console.log(`Building ${atlasCount} atlas(es) for ${tokens.length} tokens...`);
  
  for (let atlasIndex = 0; atlasIndex < atlasCount; atlasIndex++) {
    const startIdx = atlasIndex * TILES_PER_ATLAS;
    const endIdx = Math.min(startIdx + TILES_PER_ATLAS, tokens.length);
    const atlasTokens = tokens.slice(startIdx, endIdx);
    
    const atlasSize = TILES_PER_ROW * TILE_SIZE;
    const composites: any[] = [];
    
    for (let i = 0; i < atlasTokens.length; i++) {
      const token = atlasTokens[i];
      const row = Math.floor(i / TILES_PER_ROW);
      const col = i % TILES_PER_ROW;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      
      try {
        console.log(`Processing ${token.title} (${i + 1}/${atlasTokens.length})...`);
        const imageBuffer = await downloadImage(token.thumbnail_url);
        
        if (!imageBuffer) {
          console.warn(`Skipping ${token.title} - no image data`);
          continue;
        }
        
        const resizedBuffer = await sharp(imageBuffer)
          .resize(TILE_SIZE, TILE_SIZE, {
            fit: 'cover',
            position: 'centre'
          })
          .jpeg({ quality: 85 })
          .toBuffer();
          
        composites.push({
          input: resizedBuffer,
          top: y,
          left: x
        });
        
        mappings.push({
          id: token.id,
          atlas: atlasIndex,
          x,
          y,
          width: TILE_SIZE,
          height: TILE_SIZE
        });
      } catch (error) {
        console.error(`Failed to process ${token.title}:`, error);
      }
    }
    
    const atlas = sharp({
      create: {
        width: atlasSize,
        height: atlasSize,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
    .composite(composites)
    .jpeg({ quality: 85 });
    
    const atlasPath = path.join(publicDir, `atlas-${atlasIndex}.jpg`);
    await atlas.toFile(atlasPath);
    
    const stats = await fs.stat(atlasPath);
    console.log(`Created ${atlasPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  const mappingPath = path.join(publicDir, 'atlas.json');
  await fs.writeFile(mappingPath, JSON.stringify(mappings, null, 2));
  console.log(`Created ${mappingPath}`);
  
  return mappings;
}

async function main() {
  try {
    console.log('Fetching NFT tokens...');
    const tokens = await fetchNFTTokens();
    console.log(`Found ${tokens.length} tokens`);
    
    const validTokens = tokens.filter(t => t.thumbnail_url);
    console.log(`${validTokens.length} tokens have valid thumbnail URLs`);
    
    await buildAtlases(validTokens);
    
    console.log('Atlas build complete!');
  } catch (error) {
    console.error('Atlas build failed:', error);
    process.exit(1);
  }
}

main();