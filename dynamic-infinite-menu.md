# Dynamic Sphere Implementation Plan

## Overview
This document outlines the approach for implementing a dynamic sphere that automatically adjusts its vertex count based on the number of items being displayed, maintaining optimal density while preserving the spherical shape and existing interactions.

## Goals
1. Display all available items within the sphere (no hidden items requiring scrolling)
2. Maintain visually pleasing density regardless of item count (5 to 753+ items)
3. Smooth transitions when filtering changes the item count
4. Preserve user orientation and interaction momentum during transitions
5. Optimize performance for both small and large datasets

## Technical Approach

### Phase 1: Dynamic Geometry System
**Goal**: Create a sphere where vertex count EXACTLY matches the number of items

#### 1.1 Direct Vertex-to-Item Mapping
**IMPORTANT**: Each vertex will represent exactly ONE item. No cycling, no hidden items.

```typescript
// Instead of fixed subdivision levels, we'll generate custom geometries
function createCustomSphere(itemCount: number): Geometry {
  if (itemCount <= 12) {
    // Use icosahedron vertices directly
    return new IcosahedronGeometry();
  } else if (itemCount <= 42) {
    // Use subdivided icosahedron
    return new IcosahedronGeometry().subdivide(1);
  } else {
    // Generate points using Fibonacci sphere algorithm for exact count
    return new FibonacciSphereGeometry(itemCount);
  }
}
```

#### 1.2 Fibonacci Sphere Algorithm
For item counts > 42, we'll use the Fibonacci sphere point distribution:
```typescript
class FibonacciSphereGeometry extends Geometry {
  constructor(pointCount: number, radius: number = 2) {
    super();
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < pointCount; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / pointCount);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      this.addVertex(x, y, z);
    }
    
    // Generate triangulation using Delaunay on sphere surface
    this.generateSphericalTriangulation();
  }
}
```

This ensures:
- 5 items = sphere with exactly 5 vertices
- 100 items = sphere with exactly 100 vertices  
- 753 items = sphere with exactly 753 vertices

### Phase 2: Smooth Transition System
**Goal**: Create visually pleasing transitions between different vertex counts

#### 2.1 Transition States
```typescript
interface TransitionState {
  isTransitioning: boolean;
  fromPositions: vec3[];
  toPositions: vec3[];
  progress: number;
  duration: number;
  startTime: number;
}
```

#### 2.2 Morphing Strategy
1. **Vertex Matching**: When vertex counts differ, use spatial proximity to match old vertices to new ones
2. **Interpolation**: Use cubic easing for smooth position transitions
3. **Opacity Fading**: Fade out excess vertices, fade in new vertices
4. **Scale Animation**: Slightly contract sphere during transition for visual cohesion

### Phase 3: Visual Presentation Modes
**Goal**: Optimize visual appearance based on item density

#### 3.1 Visual Scaling Based on Item Count
Since we always have exactly one vertex per item, we adjust visual presentation:

```typescript
function calculateVisualParameters(itemCount: number) {
  return {
    // Sphere remains constant size, but items scale
    itemScale: Math.min(1.0, 42 / itemCount), 
    
    // Adjust opacity for dense spheres to reduce visual noise
    itemOpacity: itemCount > 200 ? 0.8 : 1.0,
    
    // Camera distance adjusts to maintain visual comfort
    cameraDistance: 3 + Math.max(0, (itemCount - 42) * 0.001),
    
    // Render quality (rounded corners vs simple squares)
    useSimpleGeometry: itemCount > 500
  };
}
```

#### 3.2 Density-Based Visual Modes

**Sparse Sphere (1-20 items)**
- Large item tiles (scale: 1.0)
- Full rounded square geometry
- Increased spacing feel through larger sphere radius
- High-res textures always loaded

**Standard Sphere (21-100 items)**  
- Medium item tiles (scale: 0.7-1.0)
- Rounded square geometry
- Standard sphere radius
- High-res textures on demand

**Dense Sphere (101-500 items)**
- Smaller item tiles (scale: 0.3-0.7)
- Simplified square geometry for performance
- Slightly increased sphere radius
- Low-res textures with high-res on focus

**Ultra-Dense Sphere (500+ items)**
- Tiny item tiles (scale: 0.1-0.3)
- Simple colored squares or dots
- Larger sphere radius for better distribution
- Texture loading only for focused item

### Phase 4: Performance Optimizations
**Goal**: Maintain 60fps even with large datasets and transitions

#### 4.1 Resource Management
- Pool WebGL buffers to avoid recreation overhead
- Use transform feedback for GPU-based morphing
- Implement frustum culling for back-facing vertices

#### 4.2 Level-of-Detail (LOD)
- Reduce subdivision when camera is far away
- Increase subdivision when user zooms in
- Precompute common subdivision levels

### Phase 5: Integration Points
**Goal**: Seamlessly integrate with existing codebase

#### 5.1 API Changes
```typescript
// Update the updateItems method
public updateItems(newItems: MenuItem[]): void {
  const needsGeometryUpdate = this.shouldUpdateGeometry(newItems.length);
  
  if (needsGeometryUpdate) {
    this.transitionToNewGeometry(newItems);
  } else {
    this.redistributeItems(newItems);
  }
}
```

#### 5.2 Event Handling
- Preserve rotation state during transitions
- Maintain active item selection
- Update texture atlases efficiently

## Implementation Steps

### Step 1: Core Geometry Updates (2-3 hours)
1. Implement `calculateOptimalSubdivision()` function
2. Create `recreateGeometry()` method
3. Update `initDiscInstances()` to handle variable counts
4. Test with manual item count changes

### Step 2: Basic Transitions (2-3 hours)
1. Implement transition state management
2. Add basic position interpolation
3. Create opacity fading for appearing/disappearing vertices
4. Test smooth transitions between subdivision levels

### Step 3: Item Distribution (1-2 hours)
1. Implement sparse distribution algorithm
2. Create cycling system for dense mode
3. Add visual indicators for multi-item vertices
4. Test with various item counts

### Step 4: Performance Optimization (2-3 hours)
1. Implement buffer pooling
2. Add frustum culling
3. Profile and optimize hot paths
4. Ensure 60fps across all transitions

### Step 5: Polish and Edge Cases (1-2 hours)
1. Handle edge cases (0 items, 1 item, maximum items)
2. Fine-tune transition timing and easing
3. Add loading states for large geometry changes
4. Comprehensive testing

## Success Metrics
- Smooth 60fps performance with up to 1000 items
- Transitions complete in under 500ms
- No visual "pops" or jarring changes
- Maintains current interaction quality
- Memory usage remains stable during transitions

## Risks and Mitigations
1. **Risk**: WebGL context loss during heavy transitions
   - **Mitigation**: Implement context restoration handling
   
2. **Risk**: Memory pressure with large vertex counts
   - **Mitigation**: Implement aggressive buffer cleanup
   
3. **Risk**: Visual discontinuity during transitions
   - **Mitigation**: Use motion blur or particle effects

## Future Enhancements
1. Adaptive performance scaling based on device capabilities
2. Precomputed transition paths for common scenarios
3. GPU-accelerated morphing with compute shaders
4. Dynamic texture resolution based on vertex density