# Dynamic Sphere Implementation Plan

## Overview
Implement a dynamic sphere that displays exactly the number of filtered items while maintaining visual clarity and the exact same user interaction experience.

## Core Requirements
1. **Exact item count** = Exact vertex count (no cycling/modulo)
2. **Fixed item size** (scale = 0.25, never changes)
3. **Dynamic sphere radius** to maintain proper spacing
4. **Dynamic camera zoom** only during rotation (preserves current behavior)
5. **All interactions remain identical** (snap-to-item, rotation feel, etc.)

## Implementation Strategy

### 1. Dynamic Positioning System

Create a new class `DynamicSpherePositions` that:
- Calculates optimal sphere radius based on item count
- Generates exactly N well-distributed positions
- Ensures no overlapping with fixed item scale

```typescript
class DynamicSpherePositions {
  private readonly BASE_RADIUS = 2.0;
  private readonly ITEM_SCALE = 0.25;
  
  calculateOptimalRadius(itemCount: number): number {
    // Maintain original radius for small counts
    if (itemCount <= 42) return this.BASE_RADIUS;
    
    // Calculate based on surface area needs
    const itemArea = this.ITEM_SCALE * this.ITEM_SCALE * Math.PI;
    const totalAreaNeeded = itemArea * itemCount * 2.5; // 2.5x for spacing
    const sphereSurfaceArea = totalAreaNeeded;
    const radius = Math.sqrt(sphereSurfaceArea / (4 * Math.PI));
    
    return Math.max(this.BASE_RADIUS, radius);
  }
  
  generatePositions(itemCount: number, radius: number): vec3[] {
    // Different strategies based on count
    if (itemCount === 1) return [vec3.fromValues(0, 0, radius)];
    if (itemCount <= 12) return this.getIcosahedronPositions(itemCount, radius);
    if (itemCount <= 42) return this.getSubdividedIcosahedronPositions(itemCount, radius);
    return this.getFibonacciSpherePositions(itemCount, radius);
  }
}
```

### 2. Position Generation Algorithms

#### Icosahedron (1-12 items)
- Use standard icosahedron vertices
- Take only the first N positions needed

#### Subdivided Icosahedron (13-42 items)
- Use the current subdivision approach
- Provides familiar layout for medium counts

#### Fibonacci Sphere (43+ items)
- Optimal distribution algorithm
- Ensures even spacing at any count
- Formula:
  ```
  for i in 0 to N:
    y = 1 - (i / (N-1)) * 2
    radius_at_y = sqrt(1 - y*y)
    theta = golden_angle * i
    x = cos(theta) * radius_at_y
    z = sin(theta) * radius_at_y
  ```

### 3. Camera Behavior Updates

Modify the zoom behavior to scale with sphere radius:

```typescript
// In onControlUpdate
if (isMoving) {
  const baseZoom = this.control.rotationVelocity * 80 + 2.5;
  const radiusMultiplier = this.SPHERE_RADIUS / 2.0; // Scale relative to original
  cameraTargetZ += baseZoom * radiusMultiplier;
} else {
  // At rest: maintain proportional distance
  cameraTargetZ = this.SPHERE_RADIUS + 1.0;
}
```

### 4. Integration Points

#### Constructor/Init
- Replace fixed geometry generation with dynamic positions
- Calculate initial radius based on item count

#### updateItems Method
- Recalculate positions only if count changes
- Smoothly transition to new layout

#### Instance Buffer
- Update to handle variable vertex counts
- Reuse existing buffer management

### 5. What Remains Unchanged
- Item rendering (RoundedSquareGeometry)
- Item scale (0.25)
- Texture atlas system
- Shader programs
- ArcballControl rotation
- Snap-to-item behavior
- Depth-based opacity/scaling

## Expected Behavior

### Small Item Counts (1-42)
- Uses original sphere radius (2.0)
- Familiar icosahedron-based layouts
- Generous spacing between items

### Medium Item Counts (43-200)
- Sphere radius begins to grow
- Fibonacci distribution ensures even spacing
- Camera pulls back proportionally

### Large Item Counts (200+)
- Sphere continues to grow to prevent overlap
- Maintains fixed item size
- Zoom-out behavior scales with radius

## Benefits
1. **Visual Clarity**: Items never overlap or shrink
2. **Scalability**: Works with any item count
3. **Consistency**: Interaction feel remains identical
4. **Performance**: No cycling means simpler rendering logic

## Implementation Order
1. Create DynamicSpherePositions class
2. Integrate into InfiniteMenu initialization
3. Update camera zoom calculations
4. Modify updateItems for dynamic updates
5. Test with various item counts