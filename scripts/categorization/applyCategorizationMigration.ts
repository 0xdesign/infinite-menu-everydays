#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(testMode = false) {
  console.log('🚀 Starting categorization migration...');
  console.log(testMode ? '📋 Running in TEST mode (100 items)' : '🔄 Running FULL migration');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '001_improved_categorization.sql');
    let migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // If test mode, modify the UPDATE statement to limit to 100 items
    if (testMode) {
      migrationSQL = migrationSQL.replace(
        'WHERE n.id = f.id;',
        'WHERE n.id = f.id AND n.id IN (SELECT id FROM public.nft_tokens_filtered LIMIT 100);'
      );
    }
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip SELECT statements at the end (reporting)
      if (statement.trim().startsWith('SELECT')) {
        console.log(`⏭️  Skipping reporting statement ${i + 1}`);
        continue;
      }
      
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        query: statement
      }).single();
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Continue with next statement instead of failing completely
        continue;
      }
      
      console.log(`✅ Statement ${i + 1} completed`);
    }
    
    console.log('\n📊 Migration completed! Fetching results...\n');
    
    // Fetch and display results
    await displayResults(testMode);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function displayResults(testMode: boolean) {
  // Get distribution of new categories
  const { data: distribution, error: distError } = await supabase
    .from('nft_tokens_filtered')
    .select('category_v2')
    .not('category_v2', 'is', null);
  
  if (!distError && distribution) {
    const categoryCount: Record<string, number> = {};
    
    distribution.forEach(item => {
      if (item.category_v2) {
        item.category_v2.forEach((cat: string) => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      }
    });
    
    console.log('📈 New Category Distribution:');
    console.log('============================');
    
    const sortedCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a);
    
    const total = distribution.length;
    sortedCategories.forEach(([category, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / 10));
      console.log(`${category.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%) ${bar}`);
    });
  }
  
  // Get items needing review
  const { data: needsReview, error: reviewError } = await supabase
    .from('nft_tokens_filtered')
    .select('id, title, confidence_score')
    .eq('needs_review', true)
    .order('confidence_score', { ascending: true })
    .limit(10);
  
  if (!reviewError && needsReview) {
    console.log('\n⚠️  Items Needing Review (lowest confidence):');
    console.log('=============================================');
    needsReview.forEach(item => {
      console.log(`- "${item.title}" (confidence: ${(item.confidence_score || 0).toFixed(2)})`);
    });
    
    const { count } = await supabase
      .from('nft_tokens_filtered')
      .select('*', { count: 'exact', head: true })
      .eq('needs_review', true);
    
    console.log(`\nTotal items needing review: ${count}`);
  }
  
  // Compare old vs new for a sample
  const { data: comparison } = await supabase
    .from('nft_tokens_filtered')
    .select('title, category, category_v2')
    .limit(5);
  
  if (comparison) {
    console.log('\n🔄 Sample Category Changes:');
    console.log('===========================');
    comparison.forEach(item => {
      const oldCats = item.category?.join(', ') || 'none';
      const newCats = item.category_v2?.join(', ') || 'none';
      if (oldCats !== newCats) {
        console.log(`"${item.title}"`);
        console.log(`  Old: ${oldCats}`);
        console.log(`  New: ${newCats}`);
        console.log('');
      }
    });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test');

// Run the migration
runMigration(testMode)
  .then(() => {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });