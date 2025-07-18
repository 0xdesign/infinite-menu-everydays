# AGENT.md - Infinite Menu Everydays Project

## Build/Lint/Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run lint` - Run ESLint
- `npm run start` - Start production server
- **No testing framework configured yet** - Consider adding Jest/Vitest for testing

## Architecture & Structure
- **Framework**: Next.js 15.3.4 with App Router (`/app`)
- **Database**: Supabase (table: `nft_tokens`) with NFT token data
- **3D Visualization**: Custom WebGL2 InfiniteMenu component with sphere rendering
- **Animation**: Framer Motion for UI animations
- **Styling**: Tailwind CSS v4 with PostCSS
- **Key files**: `/lib/supabase.ts` (DB client), `/components/InfiniteMenu.tsx` (3D WebGL component)

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, use proper types
- **Imports**: Use `@/*` path aliases, Next.js font imports pattern
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Error Handling**: Use try/catch with console.error, throw errors for critical failures
- **Environment**: Use `.env.local` for secrets (Supabase keys)
- **WebGL**: Use gl-matrix for 3D math, Float32Array for buffers
- **Database**: Use Supabase client with proper TypeScript interfaces
