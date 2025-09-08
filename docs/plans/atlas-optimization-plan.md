# Atlas Optimization Implementation Plan

## Problem Statement

### Current Issue
- **Load Time**: 15-30 seconds on first load due to downloading 750+ individual images
- **Image Mismatch Bug**: When filtering items, the preview image shown while dragging differs from the image shown when focused
  - Root cause: Atlas uses array index lookup, but filtering changes array order
  - Example: Item at position [0] might be ID 755 in ALL view, but ID 47 after filtering

### Performance Impact
- 750+ individual HTTP requests for images
- 50-100MB total download
- Dynamic atlas creation on every page load
- Poor user experience on first visit

## Solution: Static Atlas with ID-Based Mapping

### Core Concept
Generate pre-built texture atlases at build time with a persistent ID-to-position mapping that remains consistent regardless of filtering.

### Technical Approach

#### 1. Atlas Generation
- Pre-generate texture atlases using existing `generate-atlases.js` script
- Create 3 atlases (256 items each) as compressed JPEGs
- Total size: ~10-15MB (vs 50-100MB of individual images)
- Store in `/public/atlases/` directory

#### 2. ID Mapping System
Generate `atlas-mapping.json` that maps each item ID to its fixed atlas position:
```json
{
  "755": { "atlas": 0, "x": 0, "y": 0 },
  "754": { "atlas": 0, "x": 1, "y": 0 },
  "753": { "atlas": 0, "x": 2, "y": 0 }
}
```

#### 3. Shader Modification
Update WebGL shader to use ID-based lookup instead of array index:
- Pass item IDs as uniform array to shader
- Look up atlas position using item ID
- Ensures correct image regardless of filter state

## Implementation Steps

### Step 1: Generate Static Assets
```bash
# Install dependencies
npm install canvas

# Generate atlases and mapping
node scripts/generate-atlases.js
```

Expected output:
- `/public/atlases/atlas-0.jpg` (4096x4096, ~3-5MB)
- `/public/atlases/atlas-1.jpg` (4096x4096, ~3-5MB)
- `/public/atlases/atlas-2.jpg` (4096x4096, ~3-5MB)
- `/public/atlases/atlas-mapping.json` (~50KB)
- `/public/atlases/metadata.json` (~2KB)

### Step 2: Update InfiniteMenu Component

#### 2.1 Load Atlas Mapping
```javascript
// On component mount
const mappingResponse = await fetch('/atlases/atlas-mapping.json');
const atlasMapping = await mappingResponse.json();
```

#### 2.2 Update Shader Uniforms
```javascript
// Pass item IDs to shader
const itemIds = new Float32Array(items.map(item => item.id));
gl.uniform1fv(discLocations.uItemIds, itemIds);
```

#### 2.3 Modify Shader Code
```glsl
// OLD: Array index based
int itemIndex = vInstanceId % uItemCount;

// NEW: ID based
float itemId = uItemIds[vInstanceId];
vec2 atlasPos = getAtlasPositionForId(itemId);
```

### Step 3: Add Verification Logging
```javascript
console.log(`ATLAS_VERIFY: Item ${id} -> Atlas pos (${x},${y})`);
console.log(`FOCUS_VERIFY: Focused ${id}, expecting atlas (${x},${y})`);
console.error(`MISMATCH: Item ${id} showed wrong image!`);
```

## Automated Testing Protocol

### Test Setup
1. Start development server: `npm run dev`
2. Initialize Playwright MCP session
3. Navigate to `http://localhost:3000`

### Test Cases

#### Test 1: ALL View Baseline
```javascript
// Click 5 random items in ALL view
for (let i = 0; i < 5; i++) {
  await browser_click({ element: "sphere item", ref: randomRef });
  const logs = await browser_console_messages();
  // Verify: ATLAS_VERIFY matches FOCUS_VERIFY
}
```

#### Test 2: Filtered View (Critical)
```javascript
// Apply AGENTS filter
await browser_click({ element: "AGENTS filter", ref: filterRef });
await browser_wait_for({ time: 1 });

// Click first item - this is where bug occurs
await browser_click({ element: "first sphere item", ref: itemRef });
const logs = await browser_console_messages();
// Verify: No MISMATCH errors
// Verify: Focused ID is NOT 755 (would indicate array index bug)
```

#### Test 3: Search Results
```javascript
// Search for specific term
await browser_type({ 
  element: "search input", 
  text: "media provenance" 
});
await browser_wait_for({ time: 1 });

// Click search result
await browser_click({ element: "search result", ref: resultRef });
const logs = await browser_console_messages();
// Verify: Image matches search result
```

#### Test 4: Rapid Filter Switching
```javascript
const filters = ['PAYMENTS', 'SOCIAL', 'ART', 'AGENTS'];
for (const filter of filters) {
  await browser_click({ element: `${filter} filter`, ref: filterRef });
  await browser_wait_for({ time: 0.5 });
  
  // Click random item
  await browser_click({ element: "random item", ref: itemRef });
  const logs = await browser_console_messages();
  // Verify: No mismatches across filter changes
}
```

### Success Criteria
- [ ] Zero "MISMATCH" errors in console
- [ ] All ATLAS_VERIFY logs match corresponding FOCUS_VERIFY logs
- [ ] Load time < 5 seconds (measured via console.time)
- [ ] No WebGL errors
- [ ] All 20+ test clicks show correct images

### Automated Test Report
```
=== ATLAS OPTIMIZATION TEST RESULTS ===
✓ ALL view: 5/5 items matched
✓ AGENTS filter: 5/5 items matched
✓ Search results: 5/5 items matched
✓ Filter switching: 5/5 items matched
✓ Load time: 2.3 seconds
✓ WebGL errors: 0
✓ Total mismatches: 0

RESULT: ALL TESTS PASSED
```

## Expected Outcomes

### Performance Improvements
- **Initial Load**: 15-30s → 2-3s (85-90% improvement)
- **Network Requests**: 750+ → 3-4 (99% reduction)
- **Total Download**: 50-100MB → 10-15MB (70-85% reduction)
- **Time to Interactive**: Near instant after atlas loads

### Bug Fixes
- Image mismatch between preview and focus: **FIXED**
- Consistent image display across all filter states
- Proper ID-based mapping ensures correctness

## Rollback Plan

If implementation fails:
1. Delete `/public/atlases/` directory
2. Revert InfiniteMenu changes
3. System automatically falls back to dynamic atlas generation
4. No data loss or corruption possible

## Build Integration

Add to `package.json`:
```json
{
  "scripts": {
    "prebuild": "node scripts/generate-atlases.js",
    "build": "next build"
  }
}
```

This ensures atlases are regenerated for production builds.

## Notes

- Atlas generation is deterministic - same input produces same output
- Mapping file ensures backward compatibility
- Solution works with existing high-res image loading
- GIFs and videos continue to work via high-res loader
- Mobile devices benefit most from reduced memory usage