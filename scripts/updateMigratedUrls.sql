-- Update all NFT tokens to use Supabase Storage URLs
-- This assumes the migration script has already uploaded the files

UPDATE nft_tokens
SET 
    thumbnail_url = 'https://lykbbceawbrmtursljvk.supabase.co/storage/v1/object/public/nft-media/' || id || '/poster.jpg',
    image_url = 'https://lykbbceawbrmtursljvk.supabase.co/storage/v1/object/public/nft-media/' || id || '/poster.jpg'
WHERE id IN (
    SELECT id FROM nft_tokens 
    WHERE thumbnail_url IS NOT NULL OR image_url IS NOT NULL
); 