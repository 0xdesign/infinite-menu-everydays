import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lykbbceawbrmtursljvk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyEnhancedSearchMigrations() {
  console.log('Starting enhanced search migrations...');

  try {
    // Step 1: Add image_labels column
    console.log('Step 1: Adding image_labels column...');
    const { error: labelError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.nft_tokens 
        ADD COLUMN IF NOT EXISTS image_labels text[];
      `
    });
    if (labelError) {
      console.error('Error adding image_labels column:', labelError);
    } else {
      console.log('✓ image_labels column added');
    }

    // Step 2: Create synonym mapping table
    console.log('Step 2: Creating synonym mapping table...');
    const { error: synonymTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    if (synonymTableError) {
      console.error('Error creating synonym table:', synonymTableError);
    } else {
      console.log('✓ Synonym mapping table created');
    }

    // Step 3: Update search_vector to include image_labels
    console.log('Step 3: Updating search_vector generation...');
    const { error: vectorError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    if (vectorError) {
      console.error('Error updating search_vector:', vectorError);
    } else {
      console.log('✓ search_vector updated with image_labels');
    }

    // Step 4: Add trigram index on description
    console.log('Step 4: Adding trigram index on description...');
    const { error: trgmError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
        CREATE INDEX IF NOT EXISTS idx_nft_tokens_description_trgm 
        ON public.nft_tokens USING gin (description gin_trgm_ops);
      `
    });
    if (trgmError) {
      console.error('Error adding trigram index:', trgmError);
    } else {
      console.log('✓ Trigram index on description added');
    }

    // Step 5: Create enhanced RPC function
    console.log('Step 5: Creating enhanced search RPC function...');
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    if (rpcError) {
      console.error('Error creating enhanced RPC function:', rpcError);
    } else {
      console.log('✓ Enhanced search RPC function created');
    }

    // Step 6: Populate initial synonyms
    console.log('Step 6: Populating synonym data...');
    const { error: synonymError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    if (synonymError) {
      console.error('Error populating synonyms:', synonymError);
    } else {
      console.log('✓ Synonym data populated');
    }

    console.log('\n✅ All enhanced search migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyEnhancedSearchMigrations();