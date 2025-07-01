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
- `/lib` - Shared utilities, Supabase client, and custom hooks (usePaginatedItems)
- `/components` - React components (InfiniteMenu, CategoryBar)
- `/public` - Static assets
- `/test` - Integration and performance tests

### Key Components

1. **Supabase Integration** (`lib/supabase.ts`)
   - Fetches NFT tokens from `nft_tokens` table
   - Supports both full data fetching and paginated queries
   - Maps database schema to InfiniteMenu format
   - Supports category filtering and search functionality
   - Requires environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **InfiniteMenu Component** (`components/InfiniteMenu.tsx`)
   - WebGL2-based 3D spherical menu with 42 vertices
   - Displays NFT tokens in interactive sphere with texture atlas optimization
   - Supports pagination for large datasets (200+ items)
   - Maintains rotation state across filter/search changes
   - Uses Canvas API with WebGL2 context
   - Includes multi-texture high-resolution image support

3. **InfiniteMenuRefactored Component** (`components/InfiniteMenuRefactored.tsx`)
   - Production-ready refactored version with modular architecture
   - Separate WebGL and Canvas2D renderers for broader compatibility
   - ResourceManager for proper GPU resource tracking
   - Error boundaries and context loss recovery
   - Keyboard navigation and accessibility features

### Architecture Components (Refactored Version)

- `/lib/infinitemenu/` - Modular architecture for InfiniteMenu
  - `/types` - TypeScript interfaces and types
  - `/managers` - ResourceManager, TextureManager, ProgressiveTextureLoader
  - `/renderers` - WebGLRenderer, Canvas2DRenderer
  - `/controls` - ArcballControl with keyboard support
  - `/utils` - WebGL utilities, frustum culling
  - `/geometry` - IcosahedronGeometry, DiscGeometry
  - `/shaders` - Vertex and fragment shaders

## Testing Requirements

Testing framework is now set up with Vitest and React Testing Library:
1. **Test commands**: `npm test` (watch mode), `npm run test:run` (single run)
2. **Test location**: `/test` directory with unit and integration subdirectories
3. **TDD approach**: Write tests first, then implement, then verify
4. **Focus**: Real-world user scenarios and integration tests

Current test coverage:
- ✓ Component remounting prevention
- ✓ WebGL context preservation
- ✓ Filter state management
- ✓ Performance benchmarks (large datasets, prefetching)
- ✓ Pagination with sliding window
- ✓ Memory leak prevention

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
- Task 2 ✓: InfiniteMenu WebGL component implemented with texture atlas support
- Task 3 ✓: Menu integrated with Supabase data and category filtering
- Task 4 ✓: Styling, animations, and category bar implemented
- Task 5 ✓: Performance optimization with texture atlas and priority loading
- Task 6 ✓: Fixed component remounting issue - filters now update without losing rotation state
- Task 7 ✓: Pagination implemented for large datasets (200+ items)
- Task 8 ✓: Search functionality added with live filtering
- Task 9 ✓: Progressive texture updates with smooth crossfade transitions
- Task 10 ✓: Fixed camera distance and implemented temporal cycling for large datasets
- Task 11 ✓: Texture caching system with FIFO eviction (10 texture cache)
- Task 12 ✓: Instant thumbnail display with progressive quality enhancement
- Task 13 ✓: Memory management with automatic cleanup at 70% heap usage
- Task 14 ✓: Priority loading for visible items using frustum culling
- Task 15 ✓: Multi-item high-resolution texture support (up to 12 simultaneous high-res images)

## Pagination Architecture

The application now supports efficient handling of large datasets through:

1. **Sliding Window Pagination** (`lib/usePaginatedItems.ts`)
   - Loads items in windows of 200 (configurable)
   - Prefetches adjacent pages when user approaches window boundaries
   - Maintains smooth rotation experience without interruption

2. **Search and Filter Integration**
   - Search functionality works across entire dataset
   - Category filters combine with search terms
   - Component maintains rotation state during filtering

3. **Performance Optimizations**
   - Texture atlas system for efficient GPU memory usage
   - WebGL context preserved across updates
   - React component never remounts, preventing state loss

## Texture Transition System

The InfiniteMenu now features smooth texture transitions for better wayfinding:

1. **Progressive Updates**
   - Double-buffered texture system with crossfade
   - Current textures remain visible during updates
   - 500ms eased transition between texture sets
   - Shader-based blending for smooth visual continuity

2. **Implementation Details**
   - Modified fragment shader supports texture blending via `uTextureBlend` uniform
   - Texture loading happens in background without blocking UI
   - Old textures cleaned up after transition completes
   - Prevents multiple concurrent transitions

3. **User Experience**
   - Users can see new images while rotating
   - No blank/loading states during pagination
   - Smooth crossfade helps with orientation
   - Better wayfinding through visual continuity

## Hybrid Rotation System

The InfiniteMenu intelligently adapts based on dataset size:

1. **Small Datasets (≤42 items)**
   - Static mapping: items stay in fixed positions on sphere
   - Predictable navigation for filtered/search results
   - Better for precise item selection

2. **Large Datasets (>42 items)**
   - Temporal cycling: rotation slides through all items
   - Access to entire collection through natural rotation
   - Automatic pagination integration

3. **Camera Improvements**
   - Fixed comfortable distance during drag (4.5 units)
   - Removed aggressive zoom behavior
   - Consistent viewing experience

## High-Resolution Texture System

The InfiniteMenu supports displaying multiple high-resolution images simultaneously:

1. **Multi-Texture Support**
   - Up to 12 high-res images displayed at once (GPU texture unit limit)
   - Progressive loading prioritizes visible items
   - Automatic loading as users rotate the sphere

2. **HighResTextureCache Implementation**
   - LRU cache stores up to 20 high-res textures
   - Tracks loading state to prevent duplicate requests
   - Smart eviction based on last access time

3. **Shader Architecture**
   - Fragment shader supports 12 individual texture samplers
   - Dynamic texture binding based on visible items
   - Seamless fallback to atlas textures

4. **Loading Strategy**
   - Loads high-res for visible items every 500ms
   - Prioritizes items near the active/selected item
   - Concurrent loading limited to 4 textures at once
   - Background loading continues for remaining visible items

## Performance Optimizations

The InfiniteMenu includes several performance optimizations:

1. **Texture Caching**
   - FIFO cache stores up to 10 texture atlases
   - Reduces redundant texture generation
   - Automatic cleanup of old textures

2. **Priority Loading**
   - Uses frustum culling to identify visible items
   - Loads visible thumbnails first for instant feedback
   - Background loading for off-screen items

3. **Memory Management**
   - Monitors JavaScript heap usage (Chrome only)
   - Automatic cleanup at 70% memory threshold
   - Texture cache reduction when memory is high

4. **Instant Thumbnails**
   - Shows placeholder thumbnails immediately
   - Progressive enhancement with actual images
   - Batched loading to prevent UI blocking

## Technical Limitations

1. **GPU Texture Units**
   - WebGL2 typically provides 16 texture units (TEXTURE0-TEXTURE15)
   - Current implementation uses:
     - TEXTURE0: Main atlas texture
     - TEXTURE2: Transition texture for crossfade
     - TEXTURE3-TEXTURE14: 12 high-res texture slots
   - This limits simultaneous high-res images to 12

2. **Memory Constraints**
   - High-res texture cache limited to 20 textures
   - Automatic cleanup at 70% heap usage
   - LRU eviction for texture cache management

3. **Browser Compatibility**
   - Requires WebGL2 support
   - Canvas2D fallback available in refactored version
   - Performance.memory API only available in Chrome

## Important Notes

- The user is a non-technical product designer - explain technical concepts clearly
- Build incrementally with verification at each step
- The `gl-matrix` library needs to be installed for the InfiniteMenu component
- Always use environment variables for sensitive data (Supabase keys)
- Focus on addressing root causes, not symptoms when debugging
- When items have `imageHighRes` property, those images will load progressively as visible