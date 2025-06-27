// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { execFile } = require('child_process');
const { tmpdir } = require('os');
const { promisify } = require('util');

const exec = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = 'nft-media';

async function ensureBucket() {
  console.log(`Ensuring bucket: ${BUCKET}`);
  
  // Check if bucket exists by trying to list its contents
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
   
  if (error) {
    console.error('Bucket check failed:', error);
    console.log('\nPlease create the bucket manually in Supabase dashboard:');
    console.log(`1. Go to https://supabase.com/dashboard/project/${SUPABASE_URL?.split('.')[0].replace('https://', '')}/storage/buckets`);
    console.log(`2. Click "New bucket"`);
    console.log(`3. Name: ${BUCKET}`);
    console.log(`4. Public bucket: Yes`);
    console.log(`5. File size limit: 50MB`);
    console.log(`6. Allowed MIME types: image/*, video/*`);
    process.exit(1);
  }
   
  console.log('Bucket exists and is accessible');
}

interface TokenRow {
  id: string;
  thumbnail_url: string | null;
  image_url: string | null;
}

async function migrateAssets() {
  await ensureBucket();

  console.log('Fetching all nft_tokens...');
  const { data: rows, error } = await supabase
    .from('nft_tokens')
    .select('id, thumbnail_url, image_url');

  if (error || !rows) {
    console.error('Failed to fetch rows:', error);
    return;
  }

  console.log(`Found ${rows.length} tokens to migrate.`);

  for (const row of rows) {
    const sourceUrl = row.thumbnail_url || row.image_url;
    if (!sourceUrl) {
      console.log(`Row ${row.id} has no image URL, skipping...`);
      continue;
    }

    // Proxy through weserv (fit 2400x2400)
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(sourceUrl)}&fit=2400,2400`;
    console.log(`Downloading ${row.id} via weserv...`);

    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.error(`Failed to fetch ${proxyUrl}: ${res.status}`);
      continue;
    }

    const tmpFile = path.join(tmpdir(), `${row.id}`);
    const fileBuf = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(tmpFile, fileBuf);

    let posterBuf;
    if (sourceUrl.toLowerCase().endsWith('.gif')) {
      // use sharp first frame
      posterBuf = await sharp(tmpFile, { pages: 1 }).jpeg({ quality: 90 }).toBuffer();
    } else if (sourceUrl.toLowerCase().endsWith('.mp4')) {
      // extract frame 0 via ffmpeg
      const jpgPath = `${tmpFile}.jpg`;
      await exec('ffmpeg', ['-y', '-i', tmpFile, '-frames:v', '1', jpgPath]);
      posterBuf = await fsp.readFile(jpgPath);
    } else {
      // static image as-is
      posterBuf = fileBuf;
    }

    // Upload to bucket
    const uploadPath = `${row.id}/poster.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(uploadPath, posterBuf, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`Failed to upload ${uploadPath}:`, uploadErr);
      continue;
    }

    // Construct public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadPath);

    console.log(`Uploaded ${uploadPath} -> ${publicUrl}`);

    // Update DB
    const { error: updateErr } = await supabase
      .from('nft_tokens')
      .update({ thumbnail_url: publicUrl, image_url: publicUrl })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`Failed to update row ${row.id}:`, updateErr);
    } else {
      console.log(`Updated row ${row.id} with new URL.`);
    }
  }

  console.log('Migration complete!');
}

migrateAssets().catch(console.error); 