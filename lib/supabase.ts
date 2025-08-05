import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lykbbceawbrmtursljvk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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
  const rawImage = token.thumbnail_url || token.image_url || 'https://picsum.photos/300/300?grayscale';
  const highResImage = token.image_url || token.thumbnail_url || 'https://picsum.photos/300/300?grayscale';
  return {
    id: token.id,
    image: rawImage, // Direct URL from Supabase Storage (thumbnail)
    imageHighRes: highResImage, // High-res version
    link: `/token/${token.id}`,
    title: token.title || token.token_id || `Token #${token.id}`,
    description: token.description || 'No description available',
  };
}

// Fetch infinite menu data with optional category and search filters
export async function fetchInfiniteMenuData(categories?: string[] | null, searchQuery?: string, subcat?: string | null) {
  let query = supabase
    .from('nft_tokens_filtered')
    .select('*')
    .order('id', { ascending: true });

  // Apply category filter if provided
  if (categories && categories.length > 0) {
    // Show items that match ANY of the selected categories for better exploration
    query = query.overlaps('category', categories);
  }

  // Apply subcategory filter if provided
  if (subcat) {
    query = query.eq('subcat', subcat);
  }

  // Apply search filter if provided
  if (searchQuery && searchQuery.trim()) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching NFT tokens:', error);
    return [];
  }

  return data.map(mapNFTToMenuItem);
}

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

  return Array.from(categoriesSet).sort();
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