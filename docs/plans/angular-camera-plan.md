# Angular-Based Camera Positioning Plan

## Goal
Ensure only one item is visible when focused, regardless of sphere density (1 to 750+ items).

## Core Principle
Position the camera based on the angular size of items, not sphere radius percentages.

## Implementation Steps

### 1. Calculate Item Angular Size
```typescript
// In onControlUpdate when snapped:
const itemScale = 0.25; // Fixed item size
const itemDiameter = itemScale * 2;

// Calculate how much angular space each item occupies
const averageAngularSpacing = 4 * Math.PI / this.DISC_INSTANCE_COUNT;
const angularRadius = Math.sqrt(averageAngularSpacing / Math.PI);
```

### 2. Determine Camera Distance for Isolation
```typescript
// Calculate the angular size of an item at the sphere surface
const itemAngularDiameter = 2 * Math.atan(itemDiameter / (2 * this.SPHERE_RADIUS));

// Camera should be positioned so its FOV only captures one item
// Account for the fact that items are on a curved surface
const desiredFOV = itemAngularDiameter * 0.8; // 80% to ensure isolation

// Calculate required distance from sphere center
const distanceFromCenter = itemDiameter / (2 * Math.tan(desiredFOV / 2));

// Camera position (distance from sphere surface)
cameraTargetZ = distanceFromCenter;
```

### 3. Maintain Original Visual Size
```typescript
// Original setup reference:
// - 42 items, radius 2.0, camera at 3.0
// - Item appears to fill ~30% of viewport

// Calculate the visual angle in the original setup
const ORIGINAL_VISUAL_ANGLE = 2 * Math.atan(0.25 / (3.0 - 2.0)); // ~14 degrees

// For any sphere, position camera to maintain this visual angle
const requiredDistance = itemDiameter / (2 * Math.tan(ORIGINAL_VISUAL_ANGLE / 2));
cameraTargetZ = this.SPHERE_RADIUS + requiredDistance;
```

### 4. Handle Edge Cases
- Very sparse spheres (< 10 items): Use minimum distance to avoid being inside the item
- Very dense spheres (> 500 items): Ensure camera doesn't clip through neighboring items

### 5. Smooth Transitions
- Keep the existing damping system for smooth camera movements
- Ensure the drag behavior scales proportionally

## Why This Works

1. **Geometric Correctness**: By calculating based on angular size, we ensure the camera's cone of vision only encompasses one item.

2. **Consistent Experience**: The item always appears the same size on screen, matching the original 42-item behavior.

3. **Simplicity**: No shader modifications, no complex state management - just proper math.

## Testing Approach

1. Test with item counts: 1, 10, 42, 100, 300, 750
2. Verify only the focused item is visible when snapped
3. Confirm smooth transitions between items
4. Ensure drag behavior feels natural at all densities