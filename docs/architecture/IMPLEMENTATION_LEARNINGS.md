# Implementation Learnings

Key technical learnings from building the Infinite Menu Everydays application.

## Dynamic Sphere Scaling Solution

### The Challenge

Scaling from 42 fixed items to 750+ items while maintaining proper item isolation when focused.

### Failed Approaches

1. **Angular-based calculations** - Overly complex math that didn't account for FOV
2. **Percentage-based scaling** - Camera too far from surface on large spheres
3. **Shader modifications** - Unnecessary complexity that didn't address root issues

### The Successful Solution

Four interconnected changes that work together:

1. **Scale sphere radius**
   ```typescript
   const scaleFactor = Math.sqrt(itemCount / 42);
   const sphereRadius = 2.0 * scaleFactor;
   ```

2. **Fixed distance from surface**
   ```typescript
   cameraTargetZ = sphereRadius + 1.0;  // Always 1.0 unit from surface
   ```

3. **Fixed FOV height** (The critical fix!)
   ```typescript
   const height = 2.0 * 0.35;  // Use original sphere's height
   // NOT: const height = this.SPHERE_RADIUS * 0.35;  // Wrong!
   ```

4. **Proportional drag zoom**
   ```typescript
   const minMultiplier = 3.0;   // Shows full sphere
   const maxMultiplier = 43.0;  // Maximum zoom out
   cameraTargetZ = sphereRadius * (minMultiplier + velocityMultiplier);
   ```

### Key Insight

The FOV calculation was the hidden culprit. By scaling FOV height with sphere radius, larger spheres had wider fields of view, showing multiple items even when properly positioned. Using a constant height maintains precise framing.

## Texture Atlas Loading Race Condition

### The Problem

Component displayed colored gradient squares instead of NFT images on initial load.

### Root Cause

React StrictMode double-render causes WebGL context to not be immediately available:

1. Component mounts and creates InfiniteMenu instance
2. WebGL context isn't available yet
3. Falls back to procedural colored squares
4. Context becomes available and atlases load
5. Component stuck using fallback textures

### The Solution

Three key changes to handle the race condition:

1. **Deferred Initialization**
   ```typescript
   setTimeout(() => {
     if (this.gl) {
       this.initTexture();
     } else {
       this.initTextureFallback();
     }
   }, 0);
   ```

2. **Fallback State Tracking**
   ```typescript
   private usingFallbackTexture: boolean = false;
   ```

3. **Runtime Texture Switching**
   ```typescript
   if (this.usingFallbackTexture && this.atlases.length > 0) {
     this.tex = this.atlases[0];
     this.usingFallbackTexture = false;
   }
   ```

### Current Limitation

Only the first 256 items display correctly due to single atlas usage. Full multi-atlas support would require:
- Multiple texture units bound simultaneously
- Shader logic to select correct atlas
- Or batched rendering per atlas

## Design System Evolution

### Typography Pattern

Evolved to **ALL CAPS for all clickable elements** to create:
- Terminal/command-line aesthetic
- Immediate recognition of interactive elements
- Clear hierarchy between actionable and descriptive text

### Active State Indicators

Evolution from heavy to minimal:
- **Before**: 0.5w × 4h rounded bar
- **After**: 1px × 3h precise line
- **Why**: Less visual noise, better scale with ALL CAPS

### Letter Spacing as State

Using typography itself as state indicator:
- **Active**: `tracking-[0.08em]` (expanded)
- **Inactive**: `tracking-normal` (default)

This subtle change enhances readability without adding visual clutter.

## Mobile UX Innovations

### Bottom Sheet Implementation

Custom draggable bottom sheet with three snap points:
- **Collapsed**: 80px (shows title/date)
- **Half**: 50% viewport height
- **Full**: 90% viewport height

### Velocity-Based Gestures

Implemented velocity detection (0.5px/ms threshold) for natural feeling swipes that respect user intent rather than just position.

### Touch Event Handling

Careful management of touch events to prevent conflicts:
- Record initial position and height on touch start
- Update with bounds checking on move
- Calculate velocity and snap on end

## Performance Optimizations

### Pre-allocated Matrices

All transformation matrices allocated once outside render loop to prevent garbage collection pressure during animation.

### Texture Atlas System

Groups 256 images per atlas to minimize draw calls and texture swaps.

### Debounced Search

300ms debounce on search input prevents excessive API calls while maintaining responsive feel.

### Dynamic Instance Count

Sphere only renders instances for visible items, reducing GPU load when filtering.

## Database Design Decisions

### View-Based Architecture

Using `nft_tokens_filtered` view instead of direct table queries:
- Optimized subset of data
- Pre-computed fields
- Better query performance

### RPC Functions for Search

Custom PostgreSQL functions for complex search logic keeps business logic in database where it's most efficient.

### Category Arrays

Using PostgreSQL arrays for categories allows flexible multi-category assignment without join tables.

## Lessons Learned

1. **Always verify WebGL context** before operations
2. **FOV calculations are critical** for proper framing
3. **Typography can be a state indicator** not just content
4. **Views are powerful** for performance optimization
5. **Race conditions are common** in React + WebGL
6. **Simple solutions often beat complex ones** (see sphere scaling)
7. **User context matters** - our non-technical designer user needs clear explanations

---

*Document created: September 4, 2025*