#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Configuration
const DESKTOP_CONFIG = {
  tileSize: 256,
  tilesPerRow: 16,
  atlasSize: 4096,
  itemsPerAtlas: 256
};

const MOBILE_CONFIG = {
  tileSize: 128,
  tilesPerRow: 8,
  atlasSize: 1024,
  itemsPerAtlas: 64
};

async function fetchAllItems() {
  console.log('Fetching all items from filtered view...');
  
  const { data, error } = await supabase
    .from('nft_tokens_filtered')
    .select('*')
    .order('id', { ascending: true });
    
  if (error) {
    throw new Error(`Failed to fetch items: ${error.message}`);
  }
  
  console.log(`Fetched ${data.length} items`);
  return data;
}

async function downloadImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return null;
  }
}

async function createAtlas(items, config, outputPrefix) {
  const { tileSize, tilesPerRow, atlasSize, itemsPerAtlas } = config;
  const atlasCount = Math.ceil(items.length / itemsPerAtlas);
  
  console.log(`Creating ${atlasCount} atlases for ${outputPrefix}...`);
  
  const mapping = [];
  
  for (let atlasIndex = 0; atlasIndex < atlasCount; atlasIndex++) {
    const startIdx = atlasIndex * itemsPerAtlas;
    const endIdx = Math.min(startIdx + itemsPerAtlas, items.length);
    const atlasItems = items.slice(startIdx, endIdx);
    
    console.log(`Creating atlas ${atlasIndex} with items ${startIdx}-${endIdx-1}...`);
    
    // Create blank canvas
    const canvas = sharp({
      create: {
        width: atlasSize,
        height: atlasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    });
    
    const composites = [];
    
    for (let i = 0; i < atlasItems.length; i++) {
      const item = atlasItems[i];
      // Use image_url for consistency (not thumbnail_url)
      const imageUrl = item.image_url || item.thumbnail_url;
      
      if (!imageUrl) {
        console.warn(`Item ${item.id} has no image URL`);
        continue;
      }
      
      const imageBuffer = await downloadImage(imageUrl);
      if (!imageBuffer) continue;
      
      try {
        // Resize image to tile size with cover-like behavior
        const resized = await sharp(imageBuffer)
          .resize(tileSize, tileSize, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();
        
        const x = (i % tilesPerRow) * tileSize;
        const y = Math.floor(i / tilesPerRow) * tileSize;
        
        composites.push({
          input: resized,
          left: x,
          top: y
        });
        
        // Add to mapping
        mapping.push({
          id: item.id,
          atlas: atlasIndex,
          x: x,
          y: y,
          width: tileSize,
          height: tileSize
        });
        
      } catch (err) {
        console.error(`Failed to process image for item ${item.id}:`, err.message);
      }
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  Processed ${i + 1}/${atlasItems.length} items...`);
      }
    }
    
    // Composite all images onto canvas
    const atlasBuffer = await canvas
      .composite(composites)
      .webp({ quality: 85 })
      .toBuffer();
    
    // Save atlas
    const atlasPath = path.join('public', `${outputPrefix}-${atlasIndex}.webp`);
    await fs.writeFile(atlasPath, atlasBuffer);
    console.log(`Saved ${atlasPath}`);
  }
  
  // Save mapping
  const mappingPath = path.join('public', `${outputPrefix}.json`);
  await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`Saved mapping to ${mappingPath}`);
  
  return mapping;
}

async function main() {
  try {
    // Fetch all items
    const items = await fetchAllItems();
    
    // Create desktop atlas
    console.log('\n=== Creating Desktop Atlas ===');
    await createAtlas(items, DESKTOP_CONFIG, 'atlas-master');
    
    // Create mobile atlas
    console.log('\n=== Creating Mobile Atlas ===');
    await createAtlas(items, MOBILE_CONFIG, 'atlas-master-mobile');
    
    console.log('\n✅ Atlas generation complete!');
    
  } catch (error) {
    console.error('Failed to generate atlas:', error);
    process.exit(1);
  }
}

main();