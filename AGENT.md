# AGENT.md

## Build/Lint/Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types (add to package.json if needed)

## Architecture
- **Framework**: Next.js 15.3.4 with App Router (`/app` directory)
- **Database**: Supabase for NFT token storage (`nft_tokens` table)
- **3D Visualization**: Custom WebGL2 InfiniteMenu component with gl-matrix
- **Animation**: Framer Motion for UI transitions
- **Styling**: Tailwind CSS v4 with PostCSS

## Code Style Guidelines
- **Imports**: Use `@/` path aliases, group external deps first, then internal
- **Naming**: PascalCase for components, camelCase for variables/functions, kebab-case for CSS
- **TypeScript**: Strict mode enabled, explicit interfaces for data types
- **Components**: Functional components with TypeScript interfaces for props
- **Error Handling**: Console.error for logging, throw errors for critical failures
- **Environment**: Store secrets in `.env.local` with `NEXT_PUBLIC_` prefix for client-side

## Important Notes
- Build incrementally and verify with `npm run lint` after each feature
- User is non-technical - explain complex concepts clearly
- Always use TypeScript strict mode and proper type definitions
