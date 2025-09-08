#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ATLAS_SIZE = 16; // 16x16 grid = 256 images per atlas
const CELL_SIZE = 256; // Each cell is 256x256 pixels
const ATLAS_DIMENSION = ATLAS_SIZE * CELL_SIZE; // 4096x4096 pixels

// Create output directory
const outputDir = path.join(__dirname, '..', 'public', 'atlases');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all unique categories
function getCategories(items) {
  const categories = new Set();
  items.forEach(item => {
    if (item.category && Array.isArray(item.category)) {
      item.category.forEach(cat => categories.add(cat));
    }
  });
  return Array.from(categories).sort();
}

// Filter items by category
function filterByCategory(items, category) {
  return items.filter(item => 
    item.category && item.category.includes(category)
  );
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Generate atlas for a specific set of items
async function generateAtlas(items, categoryName) {
  console.log(`\n=== Generating atlases for ${categoryName} (${items.length} items) ===`);
  
  // Create category directory
  const categoryDir = path.join(outputDir, categoryName);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  
  // Calculate number of atlases needed
  const numAtlases = Math.ceil(items.length / (ATLAS_SIZE * ATLAS_SIZE));
  console.log(`Will create ${numAtlases} atlas(es)`);
  
  // Create ID to atlas position mapping
  const idMapping = {};
  
  // Process items in chunks for each atlas
  for (let atlasIndex = 0; atlasIndex < numAtlases; atlasIndex++) {
    const startIdx = atlasIndex * ATLAS_SIZE * ATLAS_SIZE;
    const endIdx = Math.min(startIdx + ATLAS_SIZE * ATLAS_SIZE, items.length);
    const atlasItems = items.slice(startIdx, endIdx);
    
    console.log(`Generating atlas ${atlasIndex} with ${atlasItems.length} items...`);
    
    // Create canvas for this atlas
    const canvas = createCanvas(ATLAS_DIMENSION, ATLAS_DIMENSION);
    const ctx = canvas.getContext('2d');
    
    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ATLAS_DIMENSION, ATLAS_DIMENSION);
    
    // Process items in batches
    const batchSize = 10;
    for (let i = 0; i < atlasItems.length; i += batchSize) {
      const batch = atlasItems.slice(i, Math.min(i + batchSize, atlasItems.length));
      
      await Promise.all(batch.map(async (item, batchIdx) => {
        const idx = i + batchIdx;
        const gridX = idx % ATLAS_SIZE;
        const gridY = Math.floor(idx / ATLAS_SIZE);
        const x = gridX * CELL_SIZE;
        const y = gridY * CELL_SIZE;
        
        // Store ID to position mapping
        idMapping[item.id] = {
          atlas: atlasIndex,
          x: gridX,
          y: gridY
        };
        
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
    const outputPath = path.join(categoryDir, `atlas-${atlasIndex}.jpg`);
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`\nSaved to ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  }
  
  // Save metadata
  const metadata = {
    version: 1,
    category: categoryName,
    atlasSize: ATLAS_SIZE,
    cellSize: CELL_SIZE,
    numAtlases: numAtlases,
    totalItems: items.length,
    atlases: Array.from({ length: numAtlases }, (_, i) => ({
      index: i,
      url: `/atlases/${categoryName}/atlas-${i}.jpg`,
      itemCount: Math.min(ATLAS_SIZE * ATLAS_SIZE, items.length - i * ATLAS_SIZE * ATLAS_SIZE)
    }))
  };
  
  const metadataPath = path.join(categoryDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Save ID mapping
  const mappingPath = path.join(categoryDir, 'mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(idMapping, null, 2));
  
  console.log(`Saved metadata and mapping for ${categoryName}`);
  
  return {
    category: categoryName,
    itemCount: items.length,
    numAtlases: numAtlases,
    totalSize: numAtlases * 2.5 // Approximate MB per atlas
  };
}

async function generateAllAtlases() {
  console.log('Loading items data...');
  const dataPath = path.join(__dirname, '..', 'public', 'data', 'items.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const items = data.items;
  
  console.log(`Found ${items.length} total items`);
  
  const stats = [];
  
  // Generate atlas for ALL items
  const allStats = await generateAtlas(items, 'all');
  stats.push(allStats);
  
  // Get categories and generate atlas for each
  const categories = getCategories(items);
  console.log(`\nFound ${categories.length} categories:`, categories.join(', '));
  
  for (const category of categories) {
    const categoryItems = filterByCategory(items, category);
    const categoryStats = await generateAtlas(categoryItems, category);
    stats.push(categoryStats);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ATLAS GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  stats.forEach(stat => {
    console.log(`  ${stat.category}: ${stat.itemCount} items, ${stat.numAtlases} atlas(es), ~${stat.totalSize.toFixed(1)}MB`);
  });
  
  const totalSize = stats.reduce((sum, s) => sum + s.totalSize, 0);
  console.log(`\nTotal storage: ~${totalSize.toFixed(1)}MB`);
  console.log('\nAll atlases saved to:', outputDir);
}

// Check if canvas is installed
try {
  require('canvas');
} catch (error) {
  console.error('Canvas module not found. Please run: npm install canvas');
  process.exit(1);
}

// Run the generator
generateAllAtlases().catch(console.error);