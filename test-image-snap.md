# Image Change Debug Plan

## Problem Statement
When filtering items (by category or search) and then dragging/releasing the sphere, the image displayed changes between what's shown during drag and what's shown after snapping into focus.

## Phase 1: Revert Changes (Confidence: 95%)

### Steps to Revert
1. Remove all two-stage mapping code:
   - `displayToIdMapTexture` and `buildDisplayToIdMap()`
   - Two-stage shader logic in fragment shader
   - `uDisplayToIdMap` uniform and related code

2. Restore original `buildAtlasPositionMap()`:
   - Should iterate through `this.items` 
   - Use array indices, not database IDs
   - Normalize positions by dividing by 1024

3. Verify baseline:
   - Full dataset (753 items) works correctly
   - No image changes on snap

## Phase 2: Test Hypotheses (Prioritized by Confidence)

### Hypothesis 1: Vertex Count Mismatch (Confidence: 85%)
**Theory**: `DISC_INSTANCE_COUNT` doesn't match `items.length` after filtering, causing incorrect modulo calculations.

**Test Code**:
```typescript
// Add to updateItems():
console.log('VERTEX COUNT TEST:', {
  items_length: newItems.length,
  DISC_INSTANCE_COUNT: this.DISC_INSTANCE_COUNT,
  instancePositions_length: this.instancePositions.length,
  needsUpdate: this.dynamicPositions.needsUpdate(this.DISC_INSTANCE_COUNT, newCount)
});
```

**Expected if true**:
- Filtered view: items_length=4, DISC_INSTANCE_COUNT=753
- This causes `nearestVertexIndex % 4` to give wrong results

**Fix**:
```typescript
this.DISC_INSTANCE_COUNT = newItems.length;
this.instancePositions = this.dynamicPositions.generatePositions(newCount, this.SPHERE_RADIUS);
```

### Hypothesis 2: Instance Positions Not Regenerating (Confidence: 80%)
**Theory**: Vertex positions remain at original count even when items filter.

**Test Code**:
```typescript
// Add to findNearestVertexIndex():
console.log('POSITION TEST:', {
  nearestVertexIndex,
  instancePositions_length: this.instancePositions.length,
  items_length: this.items.length,
  calculated_itemIndex: nearestVertexIndex % this.items.length,
  actual_position: this.instancePositions[nearestVertexIndex]
});
```

**Expected if true**:
- instancePositions has 753 entries for 4 items
- nearestVertexIndex could be 400, giving itemIndex 0 (400 % 4)

**Fix**: Force regeneration in updateItems()

### Hypothesis 3: Instance Buffer Not Updating (Confidence: 75%)
**Theory**: WebGL instance buffer retains old size/data.

**Test Code**:
```typescript
// Add to render():
if (this._frames % 60 === 0) { // Log every second
  console.log('INSTANCE BUFFER TEST:', {
    instances_matrices_length: this.discInstances.matrices.length,
    items_count: this.items.length,
    DISC_INSTANCE_COUNT: this.DISC_INSTANCE_COUNT,
    buffer_initialized: !!this.discInstances.buffer
  });
}
```

**Expected if true**:
- matrices.length doesn't match items.length
- Shader renders wrong number of instances

**Fix**: Call `initDiscInstances(newCount)` in updateItems()

### Hypothesis 4: Atlas Mapping Assumptions (Confidence: 60%)
**Theory**: Pre-built atlases don't contain images for filtered items.

**Test Code**:
```typescript
// Add to snap detection:
const item = this.items[itemIndex];
const atlasEntry = this.atlasMapping.find(a => a.id === item?.id);
console.log('ATLAS MAPPING TEST:', {
  itemIndex,
  item_id: item?.id,
  item_title: item?.title,
  atlas_has_item: !!atlasEntry,
  atlas_position: atlasEntry ? atlasEntry.atlas * 256 + (atlasEntry.y / 256) * 16 + (atlasEntry.x / 256) : 'NOT FOUND'
});
```

**Expected if true**:
- Some filtered items have no atlas entry
- Fallback behavior causes wrong image

**Fix**: Use dynamic atlas generation for filtered views

### Hypothesis 5: High-Res Texture Loading (Confidence: 40%)
**Theory**: High-res texture load reveals underlying mismatch.

**Test Code**:
```typescript
// In loadHighResTexture():
console.log('HIGH-RES TEST:', {
  index,
  item_id: this.items[index]?.id,
  item_image: this.items[index]?.image,
  item_imageHighRes: this.items[index]?.imageHighRes,
  are_different: this.items[index]?.image !== this.items[index]?.imageHighRes
});
```

**Expected if true**:
- Different URLs for low/high res
- High-res shows different image

**Fix**: Ensure consistent image sources

## Phase 3: Implementation Priority

1. **If vertex/instance count mismatch** (Most likely):
   - Always regenerate positions and instances when items change
   - Ensure DISC_INSTANCE_COUNT = items.length

2. **If atlas mapping fails** (Fallback):
   - Use dynamic atlas generation for filtered views
   - Only use pre-built for full dataset

3. **If multiple issues** (Possible):
   - Fix vertex count first
   - Then address atlas mapping if needed

## Phase 4: Validation

After implementing fix:
1. Test full dataset - should work as before
2. Test category filter - no image change on snap
3. Test search filter - no image change on snap
4. Test returning to "All" - still works correctly

## Success Criteria
- Dragging shows same image as snapped view
- Works for all filter combinations
- No performance regression for full dataset

## Testing Instructions

1. Start the dev server: `npm run dev`
2. Open http://localhost:3001 in browser
3. Open browser console (F12)
4. Test scenarios:
   - **Full dataset**: Should work correctly (no image changes)
   - **Category filter**: Select a category, drag and release - look for image changes
   - **Search**: Type a search term, drag and release - look for image changes

5. Look for these console logs:
   - `VERTEX COUNT TEST` - Shows if vertex count matches item count
   - `POSITION TEST` - Shows snap calculation details
   - `INSTANCE BUFFER TEST` - Shows buffer state (every 1 second)
   - `ATLAS MAPPING TEST` - Shows atlas lookup details
   - `HIGH-RES TEST` - Shows texture loading details

6. Record results in test-results.md