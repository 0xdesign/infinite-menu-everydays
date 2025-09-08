import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions based on the nft_tokens table schema
export interface NFTToken {
  id: number
  token_id: string
  title: string | null
  description: string | null
  image_url: string | null
  original_url: string | null
  mint_url: string | null
  network: string | null
  collection_address: string | null
  mime_type: string | null
  downloadable_uri: string | null
  raw_metadata: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  embedding: number[] | null
  thumbnail_url: string | null
  category: string[] | null
  primary_category?: string | null
  subcat?: string | null
}

// Helper function to fetch NFT tokens
export async function fetchNFTTokens(limit?: number) {
  let query = supabase
    .from('nft_tokens_filtered')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching NFT tokens:', error)
    throw error
  }
  
  return data as NFTToken[]
}

// Helper function to fetch a single NFT token by ID
export async function fetchNFTTokenById(id: number) {
  const { data, error } = await supabase
    .from('nft_tokens_filtered')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching NFT token:', error)
    throw error
  }
  
  return data as NFTToken
}

// Map NFT tokens to InfiniteMenu format
export function mapNFTToMenuItem(token: NFTToken) {
  // Use the same image URL for both atlas and hi-res to prevent visual pops
  const imageUrl = token.image_url || token.thumbnail_url || 'https://picsum.photos/300/300?grayscale';
  return {
    id: token.id,
    image: imageUrl, // Same URL for consistency
    imageHighRes: imageUrl, // Same URL to prevent swapping
    link: `/token/${token.id}`,
    title: token.title || token.token_id || `Token #${token.id}`,
    description: token.description || 'No description available',
    mintUrl: token.mint_url || null,
    createdAt: token.created_at || null,
    categories: token.category || [],
    network: token.network || null,
    collectionAddress: token.collection_address || null,
  };
}

// Fetch infinite menu data with optional category and search filters
export async function fetchInfiniteMenuData(categories?: string[] | null, searchQuery?: string, subcat?: string | null) {
  try {
    const cats = categories && categories.length > 0 ? categories : null;
    const q = (searchQuery ?? '').trim();

    // For default view (no search query), use direct query to get all items
    // This preserves the original behavior of showing all filtered items
    if (!q) {
      let query = supabase
        .from('nft_tokens_filtered')
        .select('*')
        .order('id', { ascending: true });

      // Apply subcategory filter if provided
      if (subcat) {
        query = query.eq('subcat', subcat);
      }

      // Apply category filter if provided
      if (cats) {
        query = query.overlaps('category', cats);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching NFT tokens:', error);
        return [];
      }
      return (data ?? []).map(mapNFTToMenuItem);
    }

    // For searches, use enhanced RPC with synonym expansion and fuzzy matching
    // Try enhanced search first
    const { data: enhancedData, error: enhancedError } = await supabase
      .rpc('rpc_search_nfts_enhanced', { q, cats });

    if (!enhancedError && enhancedData) {
      return (enhancedData ?? []).map(mapNFTToMenuItem);
    }

    // Fall back to regular RPC search if enhanced is not available
    if (enhancedError) {
      console.log('Enhanced search not available, falling back to regular search');
    }

    const { data, error } = await supabase
      .rpc('rpc_search_nfts', { q, cats });

    if (error) {
      console.error('Error fetching NFT tokens via rpc_search_nfts:', error);
      // Graceful fallback to simple filter if RPC fails
      let query = supabase
        .from('nft_tokens_filtered')
        .select('*')
        .order('id', { ascending: true });
      if (cats) query = query.overlaps('category', cats);
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      const fallback = await query;
      if (fallback.error) {
        console.error('Fallback query failed:', fallback.error);
        return [];
      }
      return (fallback.data ?? []).map(mapNFTToMenuItem);
    }

    return (data ?? []).map(mapNFTToMenuItem);
  } catch (e) {
    console.error('Unexpected error fetching NFT tokens:', e);
    return [];
  }
}

// Define the new 15-category system order
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

// Fetch all available categories
export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('nft_tokens_filtered')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Extract unique categories from the array fields
  const categoriesSet = new Set<string>();
  data.forEach(row => {
    if (row.category && Array.isArray(row.category)) {
      row.category.forEach((cat: string) => categoriesSet.add(cat));
    }
  });

  // Sort categories by the defined order, with any unknown categories at the end
  const categories = Array.from(categoriesSet);
  return categories.sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    
    // If both are in the order, sort by order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only a is in the order, it comes first
    if (aIndex !== -1) return -1;
    // If only b is in the order, it comes first
    if (bIndex !== -1) return 1;
    // Neither in order, sort alphabetically
    return a.localeCompare(b);
  });
} 

// Fetch available subcategories, optionally scoped to a primary category
export async function fetchSubcategories(primaryCategory?: string | null): Promise<string[]> {
  let query = supabase
    .from('nft_tokens_filtered')
    .select('subcat, primary_category')
    .not('subcat', 'is', null);

  if (primaryCategory) {
    query = query.eq('primary_category', primaryCategory);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }

  const set = new Set<string>();
  data.forEach(row => {
    if (row.subcat) set.add(row.subcat);
  });
  return Array.from(set).sort();
}