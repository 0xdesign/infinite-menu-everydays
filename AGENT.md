# AGENT.md

This is a Next.js 15.3.4 app displaying NFT tokens in a 3D WebGL spherical menu. Uses TypeScript (strict), Tailwind v4, Supabase, and gl-matrix.

## Commands
- `npm run dev` - development server
- `npm run build` - production build  
- `npm run lint` - ESLint
- `npx tsc --noEmit` - type check
- `tsx scripts/[script].ts` - run individual migration/utility scripts

## Architecture
- **Data**: Supabase with `nft_tokens_filtered` view, search RPCs with fuzzy matching
- **WebGL**: Dynamic sphere scaling (`radius = 2.0 * sqrt(itemCount / 42)`), texture atlases (256 items each)
- **Components**: `InfiniteMenu.tsx` (WebGL), `CategoryBar.tsx` (filtering), `DynamicSpherePositions.ts` (geometry)
- **Scripts**: Database migrations, category updates, atlas generation in `/scripts`

## Code Style
- TypeScript strict mode, use `@/*` path imports
- React hooks for state, mat4/vec3 from gl-matrix for WebGL math
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Component interfaces match Supabase schema (see `lib/supabase.ts`)
- WebGL: Use deferred texture initialization to handle React StrictMode double-rendering

## Testing
No framework set up. Install Jest/RTL or Vitest when needed. Focus on Supabase integration and WebGL component tests.

## Key Implementation Notes
- Camera isolation: Fixed 1.0 unit from sphere surface, FOV uses constant `2.0 * 0.35` height
- Texture atlas loading: Defer with setTimeout(0) to avoid fallback textures on mount
- 15 categories: defi, payments, trading, agents, gaming, creators, social, identity, messaging, gating, privacy, rewards, data, infrastructure, tools
