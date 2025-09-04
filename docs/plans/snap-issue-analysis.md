# Snap Issue Analysis: Image Changes When Landing on Item

## Problem Description
When dragging the sphere with 753 items and releasing (snapping to an item), the image displayed changes from what was visible during the drag. This creates a jarring user experience where the item you thought you were selecting turns out to be different.

## Hypotheses

### 1. Multi-Atlas Wrapping Issue (HIGH PROBABILITY)
**Description**: The shader only supports a single 256-item texture atlas, causing items beyond index 255 to wrap around and display incorrect images.

**Evidence**:
- Shader code: `int atlasItemIndex = itemIndex % 256;`
- With 753 items, item 256 shows image 0, item 512 shows image 0, etc.
- Component only uses first atlas: `this.tex = this.atlases[0];`

**Why it causes the snap issue**:
- During drag: Item 512 visually shows image 0 (due to wrapping)
- On snap: Code correctly identifies item 512 and might trigger different behavior

### 2. High-Res vs Low-Res Texture Mismatch (HIGH PROBABILITY)
**Description**: The thumbnail and high-resolution images might be different or loaded from different sources.

**Evidence**:
- Supabase data includes both `thumbnail_url` and `image_url`
- On snap: `this.loadHighResTexture(itemIndex);` loads high-res version
- Mapping: `image: rawImage` (thumbnail) vs `imageHighRes: highResImage`

**Why it causes the snap issue**:
- During drag: Shows thumbnail from texture atlas
- On snap: Might load or reference different high-res image

### 3. Instance Position Generation Inconsistency (MEDIUM PROBABILITY)
**Description**: Different algorithms for generating sphere positions might create inconsistent mappings.

**Evidence**:
- ≤12 items: Icosahedron positions
- ≤42 items: Subdivided icosahedron
- >42 items: Fibonacci sphere
- Dynamic updates via `updateItems()`

**Why it causes the snap issue**:
- If position generation changes, vertex-to-item mapping shifts
- Nearest vertex might map to different item after regeneration

### 4. Floating Point Precision in Dot Product (LOW PROBABILITY)
**Description**: With 753 densely packed positions, floating point errors in nearest vertex calculation could select wrong item.

**Evidence**:
- `const d = vec3.dot(nt, this.instancePositions[i]);`
- Very small angular differences between adjacent items
- Positions near sphere's "back" have similar dot products

**Why it causes the snap issue**:
- Small numerical errors could flip which vertex is "nearest"
- More likely to affect items near the edges of visibility

### 5. Race Condition with Dynamic Updates (LOW PROBABILITY)
**Description**: If items update while dragging, the mapping could change mid-interaction.

**Evidence**:
- `updateItems()` regenerates positions and reinitializes buffers
- Real-time filtering/search could trigger updates

**Why it causes the snap issue**:
- Item count changes → position regeneration → different mapping
- User sees one item but system has already updated to new dataset

### 6. Orientation Quaternion Numerical Drift (LOW PROBABILITY)
**Description**: Quaternion representation might accumulate errors, causing rendering and selection to diverge.

**Evidence**:
- Quaternions used for all rotations
- No explicit normalization in animation loop
- Different quaternion used for rendering vs finding nearest

**Why it causes the snap issue**:
- Small orientation differences compound over time
- Rendering orientation differs from selection orientation

### 7. Rotation-Based Mapping Disconnect (MEDIUM PROBABILITY)
**Description**: The fundamental disconnect between rotated vertex positions and fixed instance-to-item mapping.

**Evidence**:
- Shader: `vInstanceId = gl_InstanceID;` then `itemIndex = vInstanceId % uItemCount;`
- Selection: Finds nearest rotated vertex position
- No rotation applied to instance-item mapping

**Why it causes the snap issue**:
- Instance 0 always shows item 0, regardless of rotation
- But after rotation, vertex 0 might not be the "front" vertex anymore

## Most Likely Cause
The issue is likely a **combination of #1 (Multi-Atlas Wrapping) and #2 (Texture Mismatch)**:

1. With 753 items but only one 256-item atlas, items wrap: item 256→0, 512→0, etc.
2. During drag, you see the wrapped image (e.g., image 0 for item 512)
3. On snap, the code correctly identifies the actual item (512) but this might:
   - Load different metadata
   - Trigger high-res texture loading from a different source
   - Show different content than the wrapped atlas image

## Proposed Solution
1. Ensure consistent image sources between atlas and high-res
2. Fix the shader to properly handle multiple atlases
3. Or limit display to first 256 items until multi-atlas support is complete

## Testing Strategy
1. Test with exactly 256 items (should work perfectly)
2. Test with 257 items (should immediately show the issue)
3. Add logging to compare:
   - Visual item index (what user sees)
   - Calculated item index (what code selects)
   - Atlas index being used
   - Image URLs being displayed