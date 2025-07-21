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

When implementing the dynamic sphere with varying item counts, the critical challenge is achieving proper item isolation when focused. The original implementation with 42 fixed items achieves this naturally, but scaling to 750+ items requires a different approach.

**Failed Approach**: Using percentage-based camera distance (e.g., 1.5x sphere radius) doesn't work because:
- With more items, each item occupies a smaller angular portion of the sphere
- A fixed percentage means the camera sees more items as the sphere grows
- Shader-based visibility tricks (alpha cutoffs, vignetting) can't fix a geometric problem

**Correct Insight**: The camera distance must be calculated based on the **angular size of an item**, not the sphere radius. The goal is to position the camera so its field of view encompasses exactly one item.

### Proposed Solution: Angular-Based Camera Positioning

1. **Calculate Angular Spacing**:
   ```typescript
   const angularSpacing = 2 * Math.PI / Math.sqrt(itemCount);
   ```

2. **Determine Required Camera Distance**:
   - Given: Item scale (0.25), desired FOV should match angular spacing
   - Calculate: Distance where one item fills the viewport
   ```typescript
   const itemAngularSize = 2 * Math.atan(itemScale / sphereRadius);
   const requiredFOV = itemAngularSize * 1.2; // 20% padding
   const cameraDistance = (itemScale / Math.tan(requiredFOV / 2)) + sphereRadius;
   ```

3. **Maintain Visual Consistency**:
   - Calculate what fraction of the viewport the item should occupy (based on original 42-item setup)
   - Apply this same fraction regardless of sphere size

4. **Simple Implementation**:
   - No shader modifications needed
   - No complex visibility states
   - Just proper geometric positioning

This approach maintains the elegance of the original design while scaling correctly to any number of items.