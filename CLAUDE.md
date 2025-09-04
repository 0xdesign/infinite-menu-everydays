# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## 🎯 TL;DR - Quick Context

**What:** Interactive 3D gallery for NFT "everydays" collection (750+ items)  
**Stack:** Next.js 15.3.4 + TypeScript + Supabase + WebGL + Tailwind CSS v4  
**Core Feature:** 3D spherical menu that dynamically scales based on item count  
**User Context:** Non-technical product designer - explain concepts clearly  

### ⚠️ CRITICAL - DO NOT:
- Modify the original Supabase database (project: `vqpdoiontwjazcxbmrhq`)
- Create files unless absolutely necessary (prefer editing existing)
- Add comments to code unless explicitly requested
- Use emojis in code or files unless user asks
- Commit changes unless explicitly requested

### ✅ ALWAYS:
- Use Supabase MCP for database operations (project: `lykbbceawbrmtursljvk`)
- Run lint/typecheck after code changes: `npm run lint` and `npx tsc --noEmit`
- Follow UPPERCASE pattern for all clickable text elements
- Test with `npm run dev` at http://localhost:3000
- Address root causes, not symptoms

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (REQUIRED)
cp .env.example .env.local
# Add your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

### Essential Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit    # Type checking
```

## 📁 Project Structure

```
/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── InfiniteMenu.tsx    # Core 3D WebGL sphere (2000+ lines)
│   ├── MetadataPanel.tsx   # Desktop item details panel
│   ├── BottomSheet.tsx     # Mobile draggable metadata
│   └── ...                 # UI components
├── lib/              # Core utilities
│   └── supabase.ts   # Database client & data fetching
├── scripts/          # Utility scripts
│   ├── categorization/     # NFT categorization scripts
│   ├── mint-dates/         # Mint date fetching scripts
│   └── migrations/         # Database migrations
├── data/             # Data exports and results
└── docs/             # Documentation
    ├── architecture/       # Technical design docs
    ├── plans/             # Implementation plans
    └── research/          # Research notes
```

## 🏗️ Architecture Overview

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

## 💾 Database

**Production DB:** Supabase project `lykbbceawbrmtursljvk`  
**Main View:** `nft_tokens_filtered` (optimized subset)

### Key Fields
- **Identity:** `id`, `token_id`, `title`, `description`
- **Media:** `image_url`, `thumbnail_url` (Supabase Storage)
- **Categories:** `category[]`, `primary_category`, `subcat`
- **Blockchain:** `mint_url`, `network`, `collection_address`, `created_at`

### Collections
- **Ethereum:** `0x5908eb01497b5d8e53c339ea0186050d487c8d0c` (346 tokens)
- **Zora:** `0x5abf0c04ab7196e2bdd19313b479baebd9f7791b` (374 tokens)
- **Start Date:** March 23, 2023 (Token #1 - Media Provenance)

## ⚡ Performance Notes

- **Texture Atlases:** 256 images per atlas (only first atlas currently used)
- **Dynamic Scaling:** Sphere radius = `2.0 * sqrt(itemCount / 42)`
- **Camera Distance:** Always 1.0 unit from sphere surface when focused
- **Memory:** Pre-allocated matrices in render loop
- **Search:** 300ms debounce on input


## ✨ Key Features

### Desktop (768px+)
- Three-column layout: Filters (160px) | 3D Sphere | Metadata (320px)
- Expandable search bar in top navigation
- Minimal text-only category filters with active indicators
- Full metadata panel with mint details

### Mobile (<768px)
- Full-screen 3D sphere
- Draggable bottom sheet (80px collapsed → 50% → 90% expanded)
- Touch gestures with velocity-based animations
- Modal overlays for filter and search

## 🎨 Design System

### Typography Rules
- **ALL CAPS** for all clickable text (buttons, links)
- **Monospace font** throughout
- **Letter spacing:** `tracking-[0.08em]` for active states

### Colors
- Background: Pure black `#000`
- Active: 100% white
- Inactive: 60% white
- Hover: 80% white

### Categories (in order)
ALL, PAYMENTS, TRADING, AGENTS, SOCIAL, IDENTITY, MESSAGING, GATING, PRIVACY, REWARDS, ART, INVEST, WALLET

## 📝 Common Tasks

### Update NFT Metadata
1. Use Supabase MCP to query `nft_tokens` table
2. Update using `execute_sql` or `apply_migration`
3. Verify changes appear in `nft_tokens_filtered` view

### Modify Categories
1. Check current categories in `lib/supabase.ts`
2. Update `CATEGORIES` array if adding new ones
3. Run scripts in `scripts/categorization/` for bulk updates

### Debug Sphere Rendering
1. Check browser console for WebGL errors
2. Verify texture atlases are loading (Network tab)
3. Look for "Switching from fallback to atlas textures" log
4. Items 256+ will show repeated images (known limitation)

### Test Mobile Layout
1. Use browser DevTools responsive mode
2. Test bottom sheet drag gestures
3. Verify modals open/close properly
4. Check touch event handling



## 🐛 Known Issues & Limitations

1. **Texture Atlas:** Only first 256 items display correctly (items 256+ show repeated images)
2. **WebGL Init:** May show colored squares briefly on first load (React StrictMode issue)
3. **Mobile Performance:** Large item counts (500+) may lag on older devices
4. **Search:** Exact match only, no fuzzy search

## 📚 Additional Documentation

- `/docs/DESIGN_PATTERNS.md` - Design system details
- `/docs/architecture/DESIGN_SYSTEM.md` - Complete design specifications
- `/docs/architecture/infinite_menu_component.md` - WebGL implementation details
- `/docs/plans/dynamic-sphere-plan.md` - Sphere scaling solution
- `/docs/research/` - Various improvement proposals

## 🔄 Recent Changes (September 2025)

- Fixed mint dates display (now shows actual dates from March 23, 2023)
- Reorganized repository structure (scripts/, docs/, data/ folders)
- Cleaned up root directory
- Updated CLAUDE.md for better onboarding

---

*Last updated: September 4, 2025*