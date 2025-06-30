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
- Task 5 ✓: Initial performance optimization with texture atlas
- Task 6 ✓: Fixed component remounting issue - filters now update without losing rotation state
- Task 7 ✓: Pagination implemented for large datasets (200+ items)
- Task 8 ✓: Search functionality added with live filtering

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

## Important Notes

- The user is a non-technical product designer - explain technical concepts clearly
- Build incrementally with verification at each step
- The `gl-matrix` library needs to be installed for the InfiniteMenu component
- Always use environment variables for sensitive data (Supabase keys)
- Focus on addressing root causes, not symptoms when debugging