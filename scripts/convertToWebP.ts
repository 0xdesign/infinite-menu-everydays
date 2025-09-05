#!/usr/bin/env tsx

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

async function convertAtlasesToWebP() {
  const publicDir = path.join(process.cwd(), 'public');
  
  // Find all atlas JPG files
  const files = await fs.readdir(publicDir);
  const atlasFiles = files.filter(f => f.startsWith('atlas-') && f.endsWith('.jpg'));
  
  console.log(`Found ${atlasFiles.length} atlas files to convert`);
  
  for (const file of atlasFiles) {
    const inputPath = path.join(publicDir, file);
    const outputPath = path.join(publicDir, file.replace('.jpg', '.webp'));
    
    console.log(`Converting ${file}...`);
    
    // Get original file size
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size / 1024 / 1024; // MB
    
    // Convert to WebP with high quality
    await sharp(inputPath)
      .webp({ 
        quality: 85,  // High quality but still smaller than JPG
        effort: 6     // Higher effort = better compression
      })
      .toFile(outputPath);
    
    // Get new file size
    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size / 1024 / 1024; // MB
    
    const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    console.log(`  ✅ ${file}: ${originalSize.toFixed(2)}MB → ${newSize.toFixed(2)}MB (${reduction}% reduction)`);
  }
  
  console.log('\n✅ WebP conversion complete!');
  console.log('Note: Original JPG files are preserved. You can delete them if WebP works correctly.');
}

convertAtlasesToWebP().catch(console.error);