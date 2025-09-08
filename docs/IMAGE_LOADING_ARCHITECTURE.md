# InfiniteMenu Image Loading & Positioning Architecture

## Overview
The InfiniteMenu component uses a WebGL2-based system to efficiently display 700+ NFT images in a 3D spherical layout using texture atlases for performance.

## 1. Image Loading Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         IMAGE LOADING FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. BUILD TIME (generate-master-atlas.js)
   ┌──────────────────┐
   │ Supabase Database│
   │  706 NFT items   │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐     ┌─────────────────┐
   │ Fetch all items  │────▶│ Download images │
   │ from DB          │     │ from Supabase   │
   └──────────────────┘     └────────┬────────┘
                                      │
                ┌─────────────────────▼─────────────────────┐
                │           Create Atlas Textures           │
                │                                           │
                │  Desktop: 4096x4096px, 512px tiles       │
                │  Mobile:  1024x1024px, 256px tiles       │
                └─────────────────────┬─────────────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   Generate Mapping    │
                          │   JSON (ID → Atlas    │
                          │   position mapping)   │
                          └───────────┬───────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │        Save to /public/           │
                    │  • atlas-master-0.webp            │
                    │  • atlas-master-1.webp            │
                    │  • atlas-master-2.webp ...        │
                    │  • atlas-master.json (mapping)    │
                    └────────────────────────────────────┘

2. RUNTIME (InfiniteMenu.tsx)
   ┌──────────────────┐
   │  Component Init  │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │     loadStaticMasterAtlas()          │
   │  1. Fetch atlas mapping JSON          │
   │  2. Load atlas textures (WebP)        │
   │  3. Upload to GPU as WebGL textures   │
   └────────────────┬─────────────────────┘
                     │
                     ▼
   ┌──────────────────────────────────────┐
   │    buildAtlasPositionMap()           │
   │  Create mapping texture for shader    │
   │  (item index → atlas position)        │
   └────────────────────────────────────────┘
```

## 2. Position Mapping System

```
┌─────────────────────────────────────────────────────────────────┐
│                      POSITION MAPPING SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

ATLAS LAYOUT (Desktop: 8x8 grid, 64 items per atlas)
┌─────────────────────────────────┐
│ Atlas 0 (4096x4096)             │
│ ┌───┬───┬───┬───┬───┬───┬───┬───┐
│ │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │  512px per tile
│ ├───┼───┼───┼───┼───┼───┼───┼───┤
│ │ 8 │ 9 │10 │11 │12 │13 │14 │15 │
│ ├───┼───┼───┼───┼───┼───┼───┼───┤
│ │16 │17 │18 │... continues      │
│ └───┴───┴───┴─────────────────────┘
└─────────────────────────────────┐

MAPPING STRUCTURE:
items[] array (filtered/sorted)     atlasMapping[] (all 706 items)
┌──────────────┐                    ┌─────────────────────┐
│ [0] ID: 234  │───────lookup──────▶│ {id:234, atlas:3,   │
│ [1] ID: 567  │                    │  x:1536, y:1024}    │
│ [2] ID: 123  │                    ├─────────────────────┤
│ ...          │                    │ {id:567, atlas:8,   │
└──────────────┘                    │  x:512, y:2048}     │
                                    └─────────────────────┘

POSITION MAPPING TEXTURE (1D texture for GPU):
┌─────────────────────────────────────────────┐
│ Texture: [192, 516, 78, 245, 632, ...]     │
│           ↑    ↑    ↑    ↑    ↑            │
│         item0 item1 item2 item3 item4      │
│                                             │
│ Each value = atlas position (0-705)        │
└─────────────────────────────────────────────┘
```

## 3. Shader Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHADER PROCESSING                         │
└─────────────────────────────────────────────────────────────────┘

For each sphere item being rendered:

1. GET ITEM INDEX
   ┌──────────────┐
   │ gl_InstanceID│ → Item index in current array (0-N)
   └──────┬───────┘
          │
          ▼
2. LOOKUP ATLAS POSITION
   ┌────────────────────────────────┐
   │ texelFetch(uAtlasPositionMap,  │
   │            ivec2(itemIndex,0)) │ → Atlas position (0-705)
   └──────────────┬─────────────────┘
                  │
                  ▼
3. CALCULATE ATLAS COORDINATES
   ┌─────────────────────────────────────┐
   │ atlasIndex = position / 64          │ → Which atlas (0,1,2...)
   │ atlasItemIndex = position % 64      │ → Position in atlas
   │ cellX = atlasItemIndex % 8          │ → Column in atlas
   │ cellY = atlasItemIndex / 8          │ → Row in atlas
   └──────────────┬──────────────────────┘
                  │
                  ▼
4. COMPUTE UV COORDINATES
   ┌─────────────────────────────────────┐
   │ cellSize = 1.0 / 8 (12.5%)         │
   │ u = (cellX + vUvs.x) * cellSize    │
   │ v = (cellY + vUvs.y) * cellSize    │
   └──────────────┬──────────────────────┘
                  │
                  ▼
5. SAMPLE TEXTURE
   ┌─────────────────────────────────────┐
   │ if (atlasIndex == 0)                │
   │   color = texture(uTex, uv)        │
   │ else if (atlasIndex == 1)           │
   │   color = texture(uTex1, uv)       │
   │ else if (atlasIndex == 2)           │
   │   color = texture(uTex2, uv)       │
   └─────────────────────────────────────┘
```

## 4. Sphere Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                      3D SPHERE POSITIONING                       │
└─────────────────────────────────────────────────────────────────┘

DYNAMIC SPHERE RADIUS:
radius = 2.0 * sqrt(itemCount / 42)

Examples:
- 100 items: radius = 3.08
- 400 items: radius = 6.17  
- 706 items: radius = 8.19

FIBONACCI SPHERE DISTRIBUTION:
┌──────────────────────────────────┐
│         Top View                 │
│     ·   ·   ·   ·   ·          │
│   ·   ·   ·   ·   ·   ·        │
│ ·   ·   ·   ·   ·   ·   ·      │
│   ·   ·   ·   ·   ·   ·        │
│     ·   ·   ·   ·   ·          │
└──────────────────────────────────┘

Each item position:
- Distributed using Fibonacci spiral
- Even spacing across sphere surface
- No clustering at poles

CAMERA & ITEM TRANSFORMS:
┌─────────────────────────┐
│   Camera always 1.0     │
│   unit from surface     │
│          ↓              │
│    ┌─────────┐         │
│    │ SPHERE  │         │
│    │ r=8.19  │         │
│    └─────────┘         │
│                        │
│ Items billboard toward │
│ camera and scale based │
│ on Z-depth             │
└─────────────────────────┘
```

## 5. Filtering & Updates

```
┌─────────────────────────────────────────────────────────────────┐
│                     FILTERING & UPDATES                          │
└─────────────────────────────────────────────────────────────────┘

When user filters (e.g., selects "PAYMENTS" category):

1. FILTER ITEMS
   ┌──────────────┐     ┌──────────────┐
   │ All 706 items│────▶│ Filtered 85  │
   └──────────────┘     └──────┬───────┘
                               │
2. UPDATE POSITION MAP         ▼
   ┌────────────────────────────────────┐
   │ buildAtlasPositionMap()            │
   │ • Maps new array indices           │
   │ • To original atlas positions      │
   │ • Updates GPU texture              │
   └────────────────────────────────────┘
                               │
3. UPDATE SPHERE               ▼
   ┌────────────────────────────────────┐
   │ • Recalculate radius               │
   │ • Redistribute positions           │
   │ • Update instance matrices         │
   └────────────────────────────────────┘

Performance: ~50ms total (vs 2000ms for dynamic atlas generation)
```

## 6. Memory Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         MEMORY LAYOUT                            │
└─────────────────────────────────────────────────────────────────┘

GPU MEMORY:
┌─────────────────────────────┐
│ Atlas Textures (3 max)      │ ~12MB total
│ • uTex:  4096x4096 RGBA     │ 
│ • uTex1: 4096x4096 RGBA     │
│ • uTex2: 4096x4096 RGBA     │
├─────────────────────────────┤
│ Position Map Texture        │ ~3KB
│ • 1024x1 R32F               │
├─────────────────────────────┤
│ Instance Data               │ ~45KB
│ • 706 x 4x4 matrices        │
└─────────────────────────────┘

CPU MEMORY:
┌─────────────────────────────┐
│ Atlas Mapping JSON          │ ~73KB
│ • 706 items with positions  │
├─────────────────────────────┤
│ Items Array                 │ ~200KB
│ • Current filtered items    │
├─────────────────────────────┤
│ Pre-allocated Matrices      │ ~45KB
│ • Animation transforms      │
└─────────────────────────────┘
```

## Key Optimizations

1. **Static Atlas Generation**: All images pre-processed at build time
2. **Position Mapping Texture**: GPU-friendly lookup for item→atlas mapping
3. **Pre-allocated Matrices**: No GC pressure during animation
4. **Texture Atlas System**: 706 images → 3 textures (massive draw call reduction)
5. **Instant Filtering**: Only position map updates, no atlas regeneration

## Current Configuration

- **Desktop**: 512x512px tiles, 8x8 grid, 64 items per atlas
- **Mobile**: 256x256px tiles, 4x4 grid, 16 items per atlas
- **Max Atlases**: 3 (shader limitation)
- **Total Items**: 706 (requires 12 atlases at current resolution)

## Issue to Resolve

Current configuration needs 12 atlases but shader only supports 3. Solutions:
1. Reduce tile size back to 256x256 (fits in 3 atlases)
2. Extend shader to support more atlases
3. Use larger atlas size (8192x8192 if supported)