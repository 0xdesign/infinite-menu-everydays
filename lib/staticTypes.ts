// Auto-generated types for static NFT data
// Generated at: 2025-09-04T16:05:58.254Z

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
