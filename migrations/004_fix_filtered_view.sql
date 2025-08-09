-- Fix the filtered view to only show the two allowed Zora collections
-- This restores the original filtering behavior

CREATE OR REPLACE VIEW public.nft_tokens_filtered AS
SELECT n.*
FROM public.nft_tokens n
WHERE n.collection_address IN (
  '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',  -- Ethereum mainnet collection (334 items)
  '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b'   -- Zora mainnet collection (372 items)
);

-- This view should return 706 items total (334 + 372)