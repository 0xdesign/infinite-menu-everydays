-- Enhanced Search Improvements: Multi-signal search with synonyms and visual labels
-- Date: 2025-08-08
-- Purpose: Fix search to find semantically and visually relevant items

-- ============================================
-- STEP 1: ADD IMAGE LABELS COLUMN
-- ============================================

ALTER TABLE public.nft_tokens 
ADD COLUMN IF NOT EXISTS image_labels text[];

-- ============================================
-- STEP 2: CREATE SYNONYM MAPPING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id serial PRIMARY KEY,
  term text NOT NULL,
  synonyms text[] NOT NULL,
  domain text,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(term)
);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term 
ON public.search_synonyms(term);

-- ============================================
-- STEP 3: UPDATE SEARCH VECTOR WITH IMAGE LABELS
-- ============================================

-- Drop existing column if it exists
ALTER TABLE public.nft_tokens 
DROP COLUMN IF EXISTS search_vector;

-- Recreate with image_labels included
ALTER TABLE public.nft_tokens
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', unaccent(coalesce(title, ''))), 'A') ||
  setweight(to_tsvector('english', unaccent(coalesce(description, ''))), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(category, '{}')::text[], ' ')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(image_labels, '{}')::text[], ' ')), 'A')
) STORED;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_nft_tokens_search_vector 
ON public.nft_tokens USING gin(search_vector);

-- ============================================
-- STEP 4: ADD TRIGRAM INDEX ON DESCRIPTION
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_nft_tokens_description_trgm 
ON public.nft_tokens USING gin (description gin_trgm_ops);

-- ============================================
-- STEP 5: CREATE ENHANCED RPC FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.rpc_search_nfts_enhanced(
  q text, 
  cats text[] DEFAULT NULL
)
RETURNS SETOF public.nft_tokens_filtered
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  expanded_query text;
  synonym_terms text[];
BEGIN
  -- Query expansion with synonyms
  expanded_query := q;
  
  -- Look up synonyms for the query
  IF q IS NOT NULL AND q != '' THEN
    SELECT array_agg(DISTINCT unnest(s.synonyms))
    INTO synonym_terms
    FROM public.search_synonyms s
    WHERE LOWER(q) = ANY(array_append(s.synonyms, s.term));
    
    -- Build expanded query with OR conditions
    IF synonym_terms IS NOT NULL THEN
      expanded_query := q || ' ' || array_to_string(synonym_terms, ' ');
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT n.*
  FROM public.nft_tokens_filtered n
  WHERE
    -- Category filter
    (cats IS NULL OR array_length(cats, 1) IS NULL OR n.category && cats)
    AND (
      coalesce(q, '') = ''
      OR n.search_vector @@ websearch_to_tsquery('english', unaccent(expanded_query))
      OR similarity(n.title, q) > 0.3
      OR similarity(n.description, q) > 0.25
    )
  ORDER BY
    -- FTS rank with expanded query
    ts_rank_cd(n.search_vector, websearch_to_tsquery('english', unaccent(coalesce(expanded_query, '')))) DESC,
    -- Category boost
    CASE WHEN cats IS NOT NULL AND array_length(cats, 1) IS NOT NULL AND n.category && cats THEN 1 ELSE 0 END DESC,
    -- Fuzzy similarity on title
    similarity(n.title, coalesce(q, '')) DESC NULLS LAST,
    -- Fuzzy similarity on description
    similarity(n.description, coalesce(q, '')) DESC NULLS LAST,
    -- Deterministic fallback
    n.id ASC
  LIMIT 200;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_search_nfts_enhanced(text, text[]) TO anon, authenticated;

-- ============================================
-- STEP 6: POPULATE INITIAL SYNONYMS
-- ============================================

INSERT INTO public.search_synonyms (term, synonyms, domain) VALUES
-- Footwear domain
('sneakers', ARRAY['shoes', 'kicks', 'footwear', 'trainers', 'runners', 'snkrs'], 'footwear'),
('shoes', ARRAY['sneakers', 'kicks', 'footwear', 'trainers', 'runners'], 'footwear'),
('nike', ARRAY['swoosh', 'jordan', 'air max', 'snkrs'], 'brands'),
('adidas', ARRAY['three stripes', 'yeezy', 'boost', 'ultraboost'], 'brands'),

-- Crypto/DeFi domain
('swap', ARRAY['exchange', 'trade', 'convert', 'dex'], 'defi'),
('defi', ARRAY['decentralized finance', 'yield', 'farming', 'liquidity', 'amm'], 'defi'),
('nft', ARRAY['non-fungible token', 'collectible', 'digital art', 'pfp'], 'nft'),

-- Social domain
('social', ARRAY['community', 'network', 'friends', 'followers', 'connections'], 'social'),
('message', ARRAY['chat', 'dm', 'messaging', 'conversation', 'communication'], 'messaging'),

-- Gaming domain
('game', ARRAY['gaming', 'play', 'gamefi', 'p2e', 'play to earn'], 'gaming'),
('bet', ARRAY['betting', 'gamble', 'wager', 'prediction', 'odds'], 'gaming')

ON CONFLICT (term) DO UPDATE
SET synonyms = EXCLUDED.synonyms,
    domain = EXCLUDED.domain;

-- ============================================
-- STEP 7: POPULATE SOME INITIAL IMAGE LABELS
-- ============================================

-- Example: Add labels for known sneaker-related items
UPDATE public.nft_tokens
SET image_labels = ARRAY['sneakers', 'footwear', 'shoes']
WHERE id IN (603, 724, 687)
  AND image_labels IS NULL;

-- Add labels for items with sneaker brands in title/description
UPDATE public.nft_tokens
SET image_labels = array_append(coalesce(image_labels, '{}'), 'sneakers')
WHERE (
  title ~* '\m(nike|adidas|jordan|yeezy|air max|boost)\M'
  OR description ~* '\m(nike|adidas|jordan|yeezy|air max|boost)\M'
)
AND NOT ('sneakers' = ANY(coalesce(image_labels, '{}')));