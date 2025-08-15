# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.3.4 application that displays NFT tokens from a Supabase database using an interactive 3D WebGL spherical menu component. The project uses TypeScript with strict mode enabled and Tailwind CSS v4 for styling.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## Architecture

### Key Technologies
- **Framework**: Next.js 15.3.4 with App Router (`/app` directory)
- **Database**: Supabase for NFT token data storage
- **3D Visualization**: Custom WebGL2 InfiniteMenu component
- **Animation**: Framer Motion for UI animations
- **Styling**: Tailwind CSS v4 with PostCSS

### Project Structure
- `/app` - Next.js app router pages and layouts
- `/lib` - Shared utilities and Supabase client
- `/components` - React components (InfiniteMenu will be added here)
- `/public` - Static assets

### Key Components

1. **Supabase Integration** (`lib/supabase.ts`)
   - Fetches NFT tokens from `infinite_menu_tokens` table
   - Maps database schema to InfiniteMenu format
   - Requires environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **InfiniteMenu Component** (to be implemented)
   - WebGL2-based 3D spherical menu
   - Displays NFT tokens in interactive sphere
   - Requires `gl-matrix` library (needs installation: `npm install gl-matrix`)
   - Uses Canvas API with WebGL2 context

## Testing Requirements

Currently, no testing framework is set up. When implementing tests:
1. Install a testing framework (e.g., Jest + React Testing Library or Vitest)
2. Follow TDD approach: write tests first, then implement, then verify
3. Focus on real-world user scenarios
4. Include integration tests for Supabase data fetching

## Environment Setup

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Workflow

The project follows an incremental development approach:
1. Complete one feature fully before moving to the next
2. Test everything after implementation
3. Use TypeScript's strict mode to catch errors early
4. Run `npm run lint` and `npm run typecheck` before considering a feature complete

## Current Status

- Task 1 ✓: Supabase integration complete with NFT token fetching
- Task 2 (in progress): Implementing InfiniteMenu WebGL component
- Task 3 (pending): Integrating menu with Supabase data
- Task 4 (pending): Styling and animations
- Task 5 (pending): Performance optimization

## Important Notes

- The user is a non-technical product designer - explain technical concepts clearly
- Build incrementally with verification at each step
- The `gl-matrix` library needs to be installed for the InfiniteMenu component
- Always use environment variables for sensitive data (Supabase keys)
- Focus on addressing root causes, not symptoms when debugging

## Dynamic Sphere Implementation Learnings

### Key Learning: Camera Positioning for Item Isolation

When implementing the dynamic sphere with varying item counts, the critical challenge is achieving proper item isolation when focused. The original implementation with 42 fixed items achieves this naturally, but scaling to 750+ items requires careful attention to THREE key factors.

### Failed Approaches

1. **Angular-based calculations**: Trying to calculate camera distance based on angular spacing between items led to overly complex math that didn't account for the FOV calculation.

2. **Percentage-based scaling**: Scaling camera distance as 1.5x sphere radius caused the camera to move too far from the surface on large spheres, making items appear tiny.

3. **Shader modifications**: Adding snap states, vignetting, and alpha cutoffs was unnecessary complexity that didn't address the root geometric issues.

### The Successful Solution

The solution required understanding three interconnected elements:

1. **Proportional Sphere Scaling**:
   ```typescript
   // Scale sphere radius based on item count to maintain angular spacing
   const scaleFactor = Math.sqrt(itemCount / 42);
   const sphereRadius = 2.0 * scaleFactor;
   ```

2. **Constant Distance from Surface**:
   ```typescript
   // Camera should maintain fixed distance from sphere surface, not center
   // Original: radius 2.0, camera at 3.0 = 1.0 from surface
   cameraTargetZ = sphereRadius + 1.0;  // Always 1.0 unit from surface
   ```

3. **Fixed FOV Calculation** (The Critical Fix):
   ```typescript
   // FOV must use original sphere's height, not current sphere's height
   const height = 2.0 * 0.35;  // Always use original sphere's height
   // NOT: const height = this.SPHERE_RADIUS * 0.35;  // This scales FOV incorrectly!
   ```

### Why This Works

- **Sphere scaling**: Ensures items don't overlap by maintaining proper angular spacing
- **Surface distance**: Keeps items at consistent physical distance from camera
- **Fixed FOV**: Maintains the same viewing angle regardless of sphere size, ensuring only one item is visible when focused

### Key Insight

The FOV calculation was the hidden culprit. By scaling the FOV height with the sphere radius, larger spheres had wider fields of view, showing multiple items even when the camera was properly positioned. Fixing this to use a constant height maintains the original's precise framing.

### Drag Camera Behavior

The final piece was making the drag zoom behavior proportional to sphere size:

**The Problem**: Fixed distance from surface meant larger spheres appeared too close when dragging began, not showing enough of the sphere for comfortable exploration.

**The Solution**: Use proportional multipliers instead of fixed distances:
```typescript
// Original behavior: camera at 3x radius when starting drag, up to 43x when fully zoomed
const minMultiplier = 3.0;   // Shows full sphere comfortably
const maxMultiplier = 43.0;  // Maximum zoom out
cameraTargetZ = sphereRadius * (minMultiplier + velocityMultiplier);
```

This ensures consistent exploration experience:
- Small sphere (r=2): Camera starts at 6.0, zooms to 86
- Large sphere (r=8.45): Camera starts at 25.35, zooms to 363.35
- Always shows the same proportion of the sphere

### Complete Solution Summary

The dynamic sphere implementation required four simple but interconnected changes:

1. **Scale sphere radius**: `radius = 2.0 * sqrt(itemCount / 42)`
2. **Fixed snap distance**: `camera = radius + 1.0` (from surface)
3. **Fixed FOV height**: `height = 2.0 * 0.35` (not scaled)
4. **Proportional drag zoom**: `camera = radius * (3.0 to 43.0)`

This elegant solution perfectly replicates the original component's behavior at any scale with minimal code changes.

## Texture Atlas Loading Issue Resolution

### The Problem

When loading 750+ items, the InfiniteMenu component displayed colored gradient squares instead of actual NFT images. The issue was particularly persistent on initial page load, and when isolating an item, the image shown differed from what was visible during drag.

### Root Cause Analysis

The component initialization occurred in this problematic sequence:
1. React component mounts and creates InfiniteMenu instance
2. WebGL context isn't immediately available (React's double-render in StrictMode)
3. Component falls back to procedural colored square texture generation
4. WebGL context becomes available and texture atlases load successfully
5. Component remains stuck using fallback textures, never switching to loaded atlases

### Failed Approaches

1. **Modulo Fix**: Assumed vertex-to-item index mismatch, but shader already handled this correctly
2. **Loading State Flag**: Added `texturesReady` to delay rendering, but fallback texture was already created
3. **Multi-Atlas Shader**: Overcomplicated shader with texture switching logic
4. **Complex Batching**: Attempted to render items in separate draw calls per atlas

These approaches failed because they addressed symptoms rather than the core initialization race condition.

### The Solution

The fix required three key changes:

1. **Deferred Texture Initialization**:
   ```typescript
   // Use setTimeout to ensure WebGL context is fully ready
   setTimeout(() => {
     if (this.gl) {
       this.initTexture();
     } else {
       console.error('WebGL context not available after timeout');
       this.initTextureFallback();
     }
   }, 0);
   ```

2. **Fallback State Tracking**:
   ```typescript
   private usingFallbackTexture: boolean = false;
   ```

3. **Runtime Texture Switching**:
   ```typescript
   // In render(): Switch from fallback to atlas textures when available
   if (this.usingFallbackTexture && this.atlases.length > 0) {
     console.log('Switching from fallback to atlas textures');
     this.tex = this.atlases[0];
     this.usingFallbackTexture = false;
   }
   ```

4. **Fixed Shader Cell Calculation**:
   ```glsl
   // Always use modulo 256 for texture coordinate calculation
   int atlasItemIndex = itemIndex % 256;
   ```

### Key Learnings

1. **React StrictMode Double-Rendering**: In development, React StrictMode intentionally double-renders components to detect side effects. This can cause WebGL initialization timing issues.

2. **WebGL Context Availability**: WebGL context may not be immediately available when a component mounts. Always verify context exists before texture operations.

3. **State Persistence**: Once the component enters fallback mode, it needs explicit logic to transition out when resources become available.

4. **Shader Limitations**: The current shader assumes all items fit within one 256-item atlas. Items beyond index 255 wrap around to show images from the beginning of the atlas.

### Current Limitations

- Only the first texture atlas is used, limiting proper display to the first 256 items
- Items 256+ will show repeated images from the first atlas
- Full multi-atlas support would require:
  - Multiple texture units bound simultaneously
  - Shader logic to select correct atlas based on item index
  - Or batched rendering with different atlases per batch

This solution ensures the component gracefully handles initialization race conditions and displays actual images instead of colored squares.