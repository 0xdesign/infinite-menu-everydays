const fs = require('fs');
const path = require('path');

console.log('=== ATLAS OPTIMIZATION TEST ===\n');

// Test 1: Check atlas files exist
console.log('TEST 1: Checking atlas files...');
const atlasDir = path.join(__dirname, 'public', 'atlases');
const expectedFiles = [
  'atlas-0.jpg',
  'atlas-1.jpg', 
  'atlas-2.jpg',
  'atlas-mapping.json',
  'metadata.json'
];

let allFilesExist = true;
for (const file of expectedFiles) {
  const filePath = path.join(atlasDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file}: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
  } else {
    console.log(`✗ ${file}: NOT FOUND`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Missing atlas files. Run: node scripts/generate-atlases.js');
  process.exit(1);
}

// Test 2: Verify ID mapping structure
console.log('\nTEST 2: Verifying ID mapping...');
const mappingPath = path.join(atlasDir, 'atlas-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

const itemIds = Object.keys(mapping);
console.log(`Total items in mapping: ${itemIds.length}`);

// Check mapping structure
const sampleIds = itemIds.slice(0, 5);
console.log('\nSample mappings:');
for (const id of sampleIds) {
  const entry = mapping[id];
  if (entry && typeof entry.atlas === 'number' && typeof entry.x === 'number' && typeof entry.y === 'number') {
    console.log(`✓ ID ${id}: Atlas ${entry.atlas} at position (${entry.x}, ${entry.y})`);
  } else {
    console.log(`✗ ID ${id}: Invalid mapping structure`);
  }
}

// Test 3: Verify items.json matches mapping
console.log('\nTEST 3: Cross-checking with items.json...');
const itemsPath = path.join(__dirname, 'public', 'data', 'items.json');
const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
const items = itemsData.items;

console.log(`Items in items.json: ${items.length}`);
console.log(`Items in atlas mapping: ${itemIds.length}`);

// Check if all items have mappings
let missingCount = 0;
for (const item of items) {
  if (!mapping[item.id]) {
    missingCount++;
    if (missingCount <= 5) {
      console.log(`✗ Item ID ${item.id} not found in atlas mapping`);
    }
  }
}

if (missingCount > 0) {
  console.log(`\n⚠️  ${missingCount} items missing from atlas mapping`);
} else {
  console.log('\n✓ All items have atlas mappings');
}

// Test 4: Simulate filter scenario
console.log('\nTEST 4: Simulating filter scenario...');
// Simulate filtering to 'agents' category
const agentItems = items.filter(item => item.category && item.category.includes('agents'));
console.log(`Filtered to 'agents': ${agentItems.length} items`);

if (agentItems.length > 0) {
  console.log('\nFirst 5 agent items and their atlas positions:');
  for (let i = 0; i < Math.min(5, agentItems.length); i++) {
    const item = agentItems[i];
    const atlasEntry = mapping[item.id];
    if (atlasEntry) {
      console.log(`  [${i}] ID ${item.id}: Atlas ${atlasEntry.atlas} pos (${atlasEntry.x},${atlasEntry.y})`);
    } else {
      console.log(`  [${i}] ID ${item.id}: NO MAPPING FOUND!`);
    }
  }
}

console.log('\n=== TEST COMPLETE ===');
console.log('\nSummary:');
console.log(`✓ Atlas files: ${expectedFiles.length} files found`);
console.log(`✓ ID mappings: ${itemIds.length} items mapped`);
console.log(`✓ Items coverage: ${items.length - missingCount}/${items.length} items have mappings`);

if (missingCount === 0) {
  console.log('\n✅ All tests passed! Atlas optimization is ready.');
} else {
  console.log('\n⚠️  Some items missing mappings. May need to regenerate atlases.');
}