#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateStaticData() {
  console.log('Fetching NFT data from Supabase...');
  
  // Fetch all NFT tokens
  const { data: tokens, error: tokensError } = await supabase
    .from('nft_tokens_filtered')
    .select('*')
    .order('id', { ascending: true });

  if (tokensError) {
    console.error('Error fetching tokens:', tokensError);
    process.exit(1);
  }

  console.log(`Fetched ${tokens?.length || 0} NFT tokens`);

  // Extract unique categories
  const categoriesSet = new Set<string>();
  tokens?.forEach(token => {
    if (token.category && Array.isArray(token.category)) {
      token.category.forEach((cat: string) => categoriesSet.add(cat));
    }
  });

  // Sort categories according to the defined order
  const CATEGORY_ORDER = [
    'defi',
    'payments',
    'trading',
    'agents',
    'gaming',
    'creators',
    'social',
    'identity',
    'messaging',
    'gating',
    'privacy',
    'rewards',
    'data',
    'infrastructure',
    'tools'
  ];

  const categories = Array.from(categoriesSet).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  // Create data structure
  const staticData = {
    items: tokens,
    categories: categories,
    metadata: {
      totalCount: tokens?.length || 0,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  // Ensure directory exists
  const dataDir = path.join(process.cwd(), 'public', 'data');
  await fs.mkdir(dataDir, { recursive: true });

  // Write JSON file
  const outputPath = path.join(dataDir, 'items.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(staticData, null, 2),
    'utf-8'
  );

  console.log(`Static data generated at: ${outputPath}`);
  console.log(`File size: ${((JSON.stringify(staticData).length / 1024)).toFixed(2)}KB`);
  
  // Generate TypeScript types
  const typesContent = `// Auto-generated types for static NFT data
// Generated at: ${new Date().toISOString()}

export interface StaticNFTData {
  items: NFTToken[];
  categories: string[];
  metadata: {
    totalCount: number;
    generatedAt: string;
    version: string;
  };
}

export interface NFTToken {
  id: number;
  token_id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  original_url: string | null;
  mint_url: string | null;
  network: string | null;
  collection_address: string | null;
  mime_type: string | null;
  downloadable_uri: string | null;
  raw_metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  embedding: number[] | null;
  thumbnail_url: string | null;
  category: string[] | null;
  primary_category: string | null;
  subcat: string | null;
}
`;

  const typesPath = path.join(process.cwd(), 'lib', 'staticTypes.ts');
  await fs.writeFile(typesPath, typesContent, 'utf-8');
  console.log(`TypeScript types generated at: ${typesPath}`);

  console.log('\n✅ Static data generation complete!');
  console.log(`- ${tokens?.length} items`);
  console.log(`- ${categories.length} categories`);
}

// Run the script
generateStaticData().catch(console.error);