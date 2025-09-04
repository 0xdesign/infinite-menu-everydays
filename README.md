# Infinite Menu Everydays

An interactive 3D gallery for exploring NFT "everydays" collections using a WebGL spherical menu interface.

## Overview

This Next.js application displays 750+ NFT tokens in an innovative 3D spherical menu that users can explore through drag gestures. The sphere dynamically scales based on the number of items and features smooth animations for focusing on individual pieces.

### Features

- **3D WebGL Sphere**: Custom-built spherical menu with 750+ NFT items
- **Dynamic Filtering**: Real-time category filtering and search
- **Responsive Design**: Optimized layouts for desktop and mobile
- **Touch Gestures**: Mobile-friendly draggable bottom sheet for metadata
- **Performance Optimized**: Texture atlas system for efficient image loading

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account with access to the project database

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd infinite-menu-everydays
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/
├── app/              # Next.js app router
├── components/       # React components
│   └── InfiniteMenu.tsx  # Core 3D WebGL sphere
├── lib/              # Utilities and database client
├── scripts/          # Utility scripts for data management
├── docs/             # Project documentation
└── data/             # Data exports and results
```

## Development

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run lint         # Run ESLint
npx tsc --noEmit    # Type checking
```

## Tech Stack

- **Framework**: Next.js 15.3.4
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **3D Graphics**: WebGL2 (custom implementation)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

## Documentation

See `/docs` directory for detailed documentation:
- Architecture and design patterns
- Implementation plans
- Research notes

For development guidance, see `CLAUDE.md`.

## License

[License information]

## Contributing

[Contributing guidelines]