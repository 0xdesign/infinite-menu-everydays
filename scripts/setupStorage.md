# Storage Setup Instructions

The migration script requires a storage bucket named `nft-media` to be created in Supabase.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/lykbbceawbrmtursljvk/storage/buckets
2. Click "New bucket"
3. Configure as follows:
   - Name: `nft-media`
   - Public bucket: ✅ Yes
   - File size limit: 50MB
   - Allowed MIME types: `image/*,video/*`
4. Click "Create bucket"

## Option 2: Via SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nft-media', 'nft-media', true, 52428800, ARRAY['image/*', 'video/*']);

-- Enable public access
CREATE POLICY "Public Access" ON storage.objects
FOR ALL USING (bucket_id = 'nft-media');
```

## Option 3: Using Supabase CLI

If you have the Supabase CLI installed with proper auth:

```bash
supabase storage create nft-media --public --file-size-limit 50MB --allowed-mime-types "image/*,video/*"
```

Once the bucket is created, run the migration:

```bash
npx ts-node scripts/migrateAssets.ts
``` 