#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '002_search_improvements.sql');
    const raw = fs.readFileSync(migrationPath, 'utf-8');

    const statements = raw
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} search migration SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      // Skip pure SELECTs if any
      if (/^select\s/i.test(stmt)) {
        console.log(`⏭️  Skipping SELECT statement ${i + 1}`);
        continue;
      }

      console.log(`⚙️  Running statement ${i + 1}/${statements.length}`);
      const { error } = await supabase.rpc('exec_sql', { query: stmt }).single();
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // continue to next statement to apply as much as possible
        continue;
      }
      console.log(`✅ Statement ${i + 1} complete`);
    }

    console.log('✨ Search migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

main();

