#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createCanvas, loadImage } = require('canvas');

const ATLAS_SIZE = 16; // 16x16 grid = 256 images per atlas
const CELL_SIZE = 256; // Each cell is 256x256 pixels
const ATLAS_DIMENSION = ATLAS_SIZE * CELL_SIZE; // 4096x4096 pixels

// Create output directory
const outputDir = path.join(__dirname, '..', 'public', 'atlases');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Download image with retry logic
async function downloadImage(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await loadImage(url);
    } catch (error) {
      console.warn(`Failed to load ${url}, attempt ${attempt + 1}/${retries}`);
      if (attempt === retries - 1) {
        console.error(`Failed to load image after ${retries} attempts:`, url);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    }
  }
}

async function generateAtlases() {
  console.log('Loading items data...');
  const dataPath = path.join(__dirname, '..', 'public', 'data', 'items.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const items = data.items;
  
  console.log(`Found ${items.length} items to process`);
  
  // Calculate number of atlases needed
  const numAtlases = Math.ceil(items.length / (ATLAS_SIZE * ATLAS_SIZE));
  console.log(`Will create ${numAtlases} atlases`);
  
  // Process items in chunks for each atlas
  for (let atlasIndex = 0; atlasIndex < numAtlases; atlasIndex++) {
    const startIdx = atlasIndex * ATLAS_SIZE * ATLAS_SIZE;
    const endIdx = Math.min(startIdx + ATLAS_SIZE * ATLAS_SIZE, items.length);
    const atlasItems = items.slice(startIdx, endIdx);
    
    console.log(`\nGenerating atlas ${atlasIndex} with ${atlasItems.length} items...`);
    
    // Create canvas for this atlas
    const canvas = createCanvas(ATLAS_DIMENSION, ATLAS_DIMENSION);
    const ctx = canvas.getContext('2d');
    
    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ATLAS_DIMENSION, ATLAS_DIMENSION);
    
    // Process items in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < atlasItems.length; i += batchSize) {
      const batch = atlasItems.slice(i, Math.min(i + batchSize, atlasItems.length));
      
      await Promise.all(batch.map(async (item, batchIdx) => {
        const idx = i + batchIdx;
        const x = (idx % ATLAS_SIZE) * CELL_SIZE;
        const y = Math.floor(idx / ATLAS_SIZE) * CELL_SIZE;
        
        // Use thumbnail_url if available, otherwise use image_url
        const imageUrl = item.thumbnail_url || item.image_url;
        if (!imageUrl) {
          console.warn(`No image URL for item ${item.id}`);
          return;
        }
        
        const img = await downloadImage(imageUrl);
        if (img) {
          // Draw image centered in cell
          const scale = Math.min(CELL_SIZE / img.width, CELL_SIZE / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (CELL_SIZE - scaledWidth) / 2;
          const offsetY = (CELL_SIZE - scaledHeight) / 2;
          
          ctx.drawImage(
            img,
            x + offsetX,
            y + offsetY,
            scaledWidth,
            scaledHeight
          );
        }
      }));
      
      // Progress update
      const progress = Math.min(i + batchSize, atlasItems.length);
      process.stdout.write(`\rProcessed ${progress}/${atlasItems.length} items`);
    }
    
    // Save atlas
    const outputPath = path.join(outputDir, `atlas-${atlasIndex}.jpg`);
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`\nSaved atlas ${atlasIndex} to ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  // Create atlas metadata
  const metadata = {
    version: 1,
    atlasSize: ATLAS_SIZE,
    cellSize: CELL_SIZE,
    numAtlases: numAtlases,
    totalItems: items.length,
    atlases: Array.from({ length: numAtlases }, (_, i) => ({
      index: i,
      url: `/atlases/atlas-${i}.jpg`,
      itemCount: Math.min(ATLAS_SIZE * ATLAS_SIZE, items.length - i * ATLAS_SIZE * ATLAS_SIZE)
    }))
  };
  
  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\nSaved metadata to ${metadataPath}`);
  
  console.log('\nAtlas generation complete!');
}

// Check if canvas is installed
try {
  require('canvas');
} catch (error) {
  console.error('Canvas module not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install canvas', { stdio: 'inherit' });
  console.log('Canvas installed. Please run the script again.');
  process.exit(0);
}

// Run the generator
generateAtlases().catch(console.error);