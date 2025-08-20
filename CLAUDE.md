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

# Type checking (no dedicated script, use directly)
npx tsc --noEmit

# Export categories to CSV
npm run export:csv
```

## Architecture

### Core Architecture Flow

1. **Data Layer** (`lib/supabase.ts`)
   - Connects to Supabase using environment variables (REQUIRED: see Environment Setup)
   - Fetches from `nft_tokens_filtered` view (optimized subset of data)
   - Supports category filtering and search via RPC functions
   - Maps NFTToken interface to MenuItem format for the 3D menu

2. **3D Visualization** (`components/InfiniteMenu.tsx`)
   - WebGL2-based spherical menu with ~2000 lines of custom implementation
   - Dynamic sphere scaling based on item count (sqrt(itemCount/42) * 2.0)
   - Pre-allocated matrices for animation loop (performance critical)
   - Texture atlas system for loading 750+ images efficiently
   - Camera positioning: maintains 1.0 unit distance from sphere surface

3. **UI Layer** (`app/page.tsx`)
   - Three-column layout: categories sidebar (160px) | 3D sphere | details panel (320px)
   - Debounced search (300ms) to prevent excessive API calls
   - Category multi-select with immediate filtering
   - Typography-first design with uppercase clickable elements

### Database Schema

The app queries `nft_tokens_filtered` view with these key fields:
- `id`, `token_id`, `title`, `description`
- `image_url`, `thumbnail_url` (Supabase Storage URLs)
- `category[]` (array of categories)
- `primary_category`, `subcat` (categorization fields)
- `mint_url`, `network`, `collection_address` (blockchain metadata)

### Performance Optimizations

1. **Memory Management**: Pre-allocated arrays in animation loop prevent GC pressure
2. **Texture Atlases**: Groups 256 images per atlas to reduce draw calls
3. **Dynamic Geometry**: Adjusts sphere radius and instance count based on filtered items
4. **Deferred Loading**: Handles React StrictMode double-render with WebGL context

## Environment Setup

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**CRITICAL**: Never commit credentials. The app will throw an error if these are missing.

## Current Status

- ✅ Task 1: Supabase integration complete with NFT token fetching
- ✅ Task 2: InfiniteMenu WebGL component implemented with dynamic sphere scaling
- ✅ Task 3: Menu integrated with Supabase data (750+ items)
- ✅ Task 4: UI redesigned with three-column layout and minimal category filters
- ✅ Task 5: Performance optimized with texture atlas loading and efficient rendering
- ✅ Task 6: Complete UI redesign matching Figma specifications (January 2025)

## Recent UI Updates (January 2025)

### Complete Redesign Based on Figma Specifications

The entire interface has been redesigned to match the provided Figma designs with both desktop and mobile layouts.

### Desktop Layout (768px+)
- **Top Navigation Bar**: 
  - "DESIGN EVERYDAYS" title (left)
  - Expandable search bar (center) - collapses to pill when not in use
  - "ABOUT" link placeholder (right)
- **Left Sidebar (160px)**: Minimal text-only filter buttons with active indicators
- **Center**: 3D InfiniteMenu sphere (dynamic sizing)
- **Right Panel (320px)**: Metadata panel with item details
- **Bottom Controls**: Results count (left) and expand button (center)

### Mobile Layout (<768px)
- **Mobile Header**: FILTER and SEARCH pill buttons
- **Full-width sphere**: Takes entire viewport
- **Bottom Sheet**: Draggable metadata panel
  - Collapsed: 80px showing title/date
  - Expanded: 50% or full height with complete metadata
  - Touch gestures: tap, drag, velocity-based animations
- **Mobile Modals**: Full-screen filter and search interfaces

### Component Architecture
```
components/
  TopNav.tsx           # Desktop navigation with expandable search
  FilterSidebar.tsx    # Minimal category filters (desktop)
  MetadataPanel.tsx    # Right sidebar metadata (desktop)
  BottomControls.tsx   # Results count + expand button
  MobileHeader.tsx     # Mobile filter/search buttons
  BottomSheet.tsx      # Draggable mobile metadata
  MobileFilterModal.tsx # Full-screen filter UI (mobile)
  MobileSearchModal.tsx # Full-screen search UI (mobile)
  ImageModal.tsx       # Full-width image viewer (shared)
```

### Design System Updates
- **Typography**: All clickable elements use UPPERCASE monospace
- **Active States**: Horizontal line indicators (1px × 3h) for filters
- **Color Palette**: 
  - Active: 100% white
  - Inactive: 60% white
  - Hover: 80% white
  - Background: Pure black (#000)
- **Transitions**: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- **Responsive Breakpoint**: Single breakpoint at 768px (md:)

### Category Filter Design
- Text-only buttons without backgrounds
- Active state: Full white with horizontal line indicator
- Inactive state: 60% opacity white
- Categories ordered: ALL, PAYMENTS, TRADING, AGENTS, SOCIAL, IDENTITY, MESSAGING, GATING, PRIVACY, REWARDS, ART, INVEST, WALLET

### Mobile Gestures Implementation
- **Touch Start**: Records initial position and height
- **Touch Move**: Updates sheet height with bounds checking
- **Touch End**: Calculates velocity for snap animations
- **Snap Points**: Collapsed (80px), Half (50% vh), Full (90% vh)
- **Velocity Threshold**: 0.5px/ms for fast swipe detection

### Metadata Panel Features
- Item title and publication date
- Category tags (up to 3 displayed)
- Full description text
- Network information (ZORA-MAINNET, etc.)
- Collection address with block explorer links
- "VIEW ORIGINAL" button linking to mint URL

### Search & Filter Behavior
- **Search**: 300ms debounce, expandable bar, real-time filtering
- **Filters**: Multi-select categories, "ALL" clears selection
- **Results**: Live count display in bottom controls
- **Clear Actions**: X button in search (when text present)

## Important Notes

- The user is a non-technical product designer - explain technical concepts clearly
- Build incrementally with verification at each step
- The `gl-matrix` library is installed and working
- The `lucide-react` library is used for icons
- Always use environment variables for sensitive data (Supabase keys)
- Focus on addressing root causes, not symptoms when debugging
- Follow design patterns documented in `/docs/DESIGN_PATTERNS.md`
- All clickable text buttons should follow the uppercase typography pattern for consistency

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

## Design System: Clickable Text Button Pattern

### Core Principle: ALL CAPS for Clickable Text

All clickable text elements (buttons, links with text labels) must use uppercase typography to create a consistent, command-like interface that emphasizes actionability.

### Typography Standards

```css
/* Base clickable text button classes */
.clickable-text-button {
  @apply font-mono uppercase font-normal;
}
```

**Rationale:**
1. **Monospace + ALL CAPS** creates terminal/command-line aesthetic
2. **Consistency** - Users immediately recognize clickable elements
3. **Hierarchy** - Distinguishes actionable from descriptive text
4. **Accessibility** - Clear visual distinction for interactive elements

### Active State Design Pattern

For minimal category filters and similar navigation elements:

```tsx
// Pattern: Typography-based active states with minimal visual indicators
className={`
  font-mono uppercase text-xs transition-all duration-150
  ${isActive 
    ? 'text-white tracking-[0.08em]'      // Active: expanded letter spacing
    : 'text-white/60 hover:text-white/80 tracking-normal'  // Inactive: condensed
  }
`}

// Minimal line indicator
{isActive && (
  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-white" />
)}
```

**Key Improvements Over Previous Design:**
1. **Ultra-thin line** (1px instead of 0.5w) - more precise, less visual weight
2. **Shorter height** (h-3 instead of h-4) - better proportion with text
3. **Letter spacing expansion** - active items get subtle tracking increase
4. **Typography-first approach** - relies primarily on text treatment

### Implementation Examples

#### 1. Minimal Category Filters (Sidebar)
```tsx
<button className="font-mono uppercase text-xs text-white tracking-[0.08em]">
  <span>CATEGORY NAME</span>
  {/* 1px active indicator line */}
</button>
```

#### 2. Category Pills (Header)
```tsx
<button className="font-mono uppercase text-sm bg-white text-black px-4 py-2 rounded-full">
  CATEGORY NAME
</button>
```

#### 3. Action Links (CTAs)
```tsx
<a className="font-mono uppercase text-sm bg-white text-black px-4 py-2 rounded-full">
  VISIT MINT
</a>
```

### Design Decisions & Rationale

#### Active Indicator Evolution
- **Before:** 0.5w × 4h rounded bar
- **After:** 1px × 3h precise line
- **Why:** Reduces visual noise, improves precision, better scale with ALL CAPS text

#### Letter Spacing as State Indicator
- **Active:** `tracking-[0.08em]` (expanded)
- **Inactive:** `tracking-normal` (default)
- **Why:** Subtle typography change that enhances readability of active items

#### Font Weight Consistency
- **All clickable text:** `font-normal` 
- **Why:** ALL CAPS monospace works better with normal weight; avoids heaviness

### Accessibility Considerations

1. **Clear Focus States:** All interactive elements maintain visible focus indicators
2. **Color Contrast:** White text on black background exceeds WCAG AA standards
3. **Hit Targets:** Minimum 44px touch targets maintained on all clickable elements
4. **Keyboard Navigation:** Tab order follows logical flow

### Implementation Checklist

When adding new clickable text elements:
- [ ] Use `font-mono` class
- [ ] Add `uppercase` class  
- [ ] Use `font-normal` weight
- [ ] Include proper hover/focus states
- [ ] Maintain consistent spacing and sizing
- [ ] Test with keyboard navigation
- [ ] Verify color contrast ratios

This design pattern creates a cohesive, terminal-inspired interface that emphasizes clarity and actionability while maintaining the minimal aesthetic throughout the application.

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